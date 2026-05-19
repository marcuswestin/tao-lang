#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ask-local-agents.sh --slug SLUG --prompt PROMPT_FILE [--dry-run]

Asks local Codex and Claude CLIs the same prompt and writes artifacts.

Environment:
  CODEX_CMD                 Codex CLI command. Default: codex
  CLAUDE_CMD                Claude CLI command. Default: claude
  CODEX_MODEL               Optional Codex model.
  CLAUDE_MODEL              Claude model. Default: opus-4.6
  REVIEW_TIMEOUT_SECONDS    Timeout per local agent. Default: 600
  PROJECT_REVIEW_DIR        Artifact root. Default: /private/tmp/tao-project-reviews
USAGE
}

die() {
  echo "ask-local-agents: $*" >&2
  exit 1
}

safe_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd
}

agent_prompt() {
  local prompt_file="$1"
  {
    echo "Be brief: focus on the most important points, decisions, risks, and plan changes."
    echo "Do not produce a thorough deep dive into every possible issue."
    echo
    cat "$prompt_file"
  }
}

wait_with_timeout() {
  local pid="$1"
  local name="$2"
  local timeout_seconds="$3"
  local start
  start="$(date +%s)"
  while kill -0 "$pid" 2>/dev/null; do
    local now
    now="$(date +%s)"
    if [ $((now - start)) -gt "$timeout_seconds" ]; then
      kill "$pid" 2>/dev/null || true
      echo "$name timed out after ${timeout_seconds}s." >&2
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
  done
  wait "$pid"
}

run_codex() {
  local prompt_file="$1"
  local pass_dir="$2"
  local codex_cmd="${CODEX_CMD:-codex}"
  if ! command -v "$codex_cmd" >/dev/null 2>&1; then
    echo "$codex_cmd CLI not found in PATH." > "$pass_dir/codex.stderr"
    return 127
  fi
  local args=(exec -C "$REPO_ROOT" --sandbox read-only --ephemeral)
  if [ -n "${CODEX_MODEL:-}" ]; then
    args+=(--model "$CODEX_MODEL")
  fi
  args+=("$(agent_prompt "$prompt_file")")
  "$codex_cmd" "${args[@]}" > "$pass_dir/codex-review.md" 2> "$pass_dir/codex.stderr"
}

run_claude() {
  local prompt_file="$1"
  local pass_dir="$2"
  local claude_cmd="${CLAUDE_CMD:-claude}"
  local model="${CLAUDE_MODEL:-opus-4.6}"
  if ! command -v "$claude_cmd" >/dev/null 2>&1; then
    echo "$claude_cmd CLI not found in PATH." > "$pass_dir/claude.stderr"
    return 127
  fi

  "$claude_cmd" \
    --print \
    --output-format json \
    --model "$model" \
    "$(agent_prompt "$prompt_file")" > "$pass_dir/claude.raw.json" 2> "$pass_dir/claude.stderr"

  if command -v jq >/dev/null 2>&1 && jq -e '.result' "$pass_dir/claude.raw.json" >/dev/null 2>&1; then
    jq -r '.result' "$pass_dir/claude.raw.json" > "$pass_dir/claude-review.md"
  else
    cp "$pass_dir/claude.raw.json" "$pass_dir/claude-review.md"
  fi
}

SLUG=""
PROMPT_FILE=""
DRY_RUN="0"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --prompt)
      PROMPT_FILE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[ -n "$SLUG" ] || die "missing --slug"
[ -n "$PROMPT_FILE" ] || die "missing --prompt"
[ -f "$PROMPT_FILE" ] || die "prompt file not found: $PROMPT_FILE"

REPO_ROOT="$(repo_root)"
ARTIFACT_ROOT="${PROJECT_REVIEW_DIR:-/private/tmp/tao-project-reviews}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_DIR="$ARTIFACT_ROOT/$(safe_slug "$SLUG")-auto-research-$TIMESTAMP"
PASS_DIR="$ARTIFACT_DIR/pass-1"
TIMEOUT_SECONDS="${REVIEW_TIMEOUT_SECONDS:-600}"

mkdir -p "$PASS_DIR"
cp "$PROMPT_FILE" "$PASS_DIR/prompt.md"

if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run: wrote $PASS_DIR/prompt.md"
  exit 0
fi

( run_codex "$PASS_DIR/prompt.md" "$PASS_DIR" ) &
CODEX_PID="$!"
( run_claude "$PASS_DIR/prompt.md" "$PASS_DIR" ) &
CLAUDE_PID="$!"

CODEX_STATUS=0
CLAUDE_STATUS=0
wait_with_timeout "$CODEX_PID" "codex" "$TIMEOUT_SECONDS" || CODEX_STATUS="$?"
wait_with_timeout "$CLAUDE_PID" "claude" "$TIMEOUT_SECONDS" || CLAUDE_STATUS="$?"

{
  echo "codex_status=$CODEX_STATUS"
  echo "claude_status=$CLAUDE_STATUS"
} > "$PASS_DIR/status.env"

{
  echo "# Combined Auto-Research Pass 1"
  echo
  echo "## Codex"
  echo
  if [ -f "$PASS_DIR/codex-review.md" ]; then
    cat "$PASS_DIR/codex-review.md"
  else
    echo "_Codex failed; see codex.stderr._"
  fi
  echo
  echo "## Claude"
  echo
  if [ -f "$PASS_DIR/claude-review.md" ]; then
    cat "$PASS_DIR/claude-review.md"
  else
    echo "_Claude failed; see claude.stderr._"
  fi
} > "$PASS_DIR/combined-review.md"

echo "Auto-agent research artifacts: $ARTIFACT_DIR"
cat "$PASS_DIR/status.env"

if [ "$CODEX_STATUS" -ne 0 ] || [ "$CLAUDE_STATUS" -ne 0 ]; then
  exit 1
fi
