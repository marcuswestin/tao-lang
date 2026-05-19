#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./agent project-review [--mode plan|implementation] [--passes 1] [--base REF] [--research PATH] [--dry-run] <project-plan-path>

Runs Codex and Claude review prompts for a Tao project plan or implementation.

Options:
  --mode MODE       Review mode: plan or implementation. Default: plan.
  --passes N        Compatibility option. Only 1 is allowed; apply fixes and rerun for another pass.
  --base REF        Base ref for implementation diffs. Default: main.
  --research PATH   Optional project research doc. Defaults to sibling Project Research doc when present.
  --dry-run         Write prompts/artifact folders but do not invoke CLIs.
  --help            Show this help.

Environment:
  CODEX_CMD                 Codex CLI command. Default: codex
  CLAUDE_CMD                Claude CLI command. Default: claude
  CODEX_MODEL               Optional Codex model.
  CLAUDE_MODEL              Claude model. Default: sonnet
  REVIEW_TIMEOUT_SECONDS    Timeout per reviewer. Default: 600
  PROJECT_REVIEW_DIR        Artifact root. Default: /private/tmp/tao-project-reviews
USAGE
}

die() {
  echo "project-review: $*" >&2
  exit 1
}

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd
}

safe_slug() {
  basename "$1" | sed -E 's/\.[^.]+$//' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

resolve_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    echo "$path"
  else
    echo "$REPO_ROOT/$path"
  fi
}

infer_research_path() {
  local plan_path="$1"
  local research_path=""
  case "$plan_path" in
    *" Project Plan.md")
      research_path="${plan_path% Project Plan.md} Project Research.md"
      ;;
    *" Plan.md")
      research_path="${plan_path% Plan.md} Research.md"
      ;;
  esac
  if [ -n "$research_path" ] && [ -f "$research_path" ]; then
    echo "$research_path"
  fi
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

append_file_section() {
  local label="$1"
  local output="$2"
  local path="$3"
  {
    echo
    echo "## $label"
    echo
    if [ -f "$path" ]; then
      cat "$path"
    else
      echo "_Missing: ${path}_"
    fi
  } >> "$output"
}

append_command_section() {
  local label="$1"
  shift
  local output="$1"
  shift
  {
    echo
    echo "## $label"
    echo
    "$@" 2>&1 || true
  } >> "$output"
}

relative_repo_path() {
  local path="$1"
  case "$path" in
    "$REPO_ROOT"/*)
      echo "${path#"$REPO_ROOT/"}"
      ;;
    *)
      echo "$path"
      ;;
  esac
}

canonical_file_path() {
  local path="$1"
  local dir
  local base
  dir="$(dirname "$path")"
  base="$(basename "$path")"
  [ -d "$dir" ] || return 1
  (cd "$dir" && printf '%s/%s\n' "$(pwd -P)" "$base")
}

add_referenced_context_files() {
  local source_file="$1"
  local output_file="$2"
  local source_dir
  source_dir="$(dirname "$source_file")"

  {
    grep -Eoh '\[[^]]+\]\([^)]+\.(md|tao)(#[^)]*)?\)' "$source_file" 2>/dev/null || true
  } |
    sed -E 's/^.*\(([^)]*)\).*$/\1/' |
    while IFS= read -r link; do
      local raw_path
      local resolved_path
      local canonical_path
      raw_path="${link%%#*}"
      raw_path="${raw_path%%\?*}"
      raw_path="${raw_path//%20/ }"

      case "$raw_path" in
        ""|\#*|http://*|https://*|mailto:*)
          continue
          ;;
        /*)
          resolved_path="$raw_path"
          ;;
        *)
          resolved_path="$source_dir/$raw_path"
          ;;
      esac

      if [ -f "$resolved_path" ]; then
        canonical_path="$(canonical_file_path "$resolved_path")" || continue
        if [ "$canonical_path" != "$PLAN_PATH_CANONICAL" ] && [ "$canonical_path" != "${RESEARCH_PATH_CANONICAL:-}" ]; then
          printf '%s\n' "$canonical_path" >> "$output_file"
        fi
      fi
    done
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
  args+=("$(cat "$prompt_file")")
  "$codex_cmd" "${args[@]}" > "$pass_dir/codex-review.md" 2> "$pass_dir/codex.stderr"
}

run_claude() {
  local prompt_file="$1"
  local pass_dir="$2"
  local claude_cmd="${CLAUDE_CMD:-claude}"
  local model="${CLAUDE_MODEL:-sonnet}"
  if ! command -v "$claude_cmd" >/dev/null 2>&1; then
    echo "$claude_cmd CLI not found in PATH." > "$pass_dir/claude.stderr"
    return 127
  fi
  "$claude_cmd" \
    --print \
    --output-format json \
    --model "$model" \
    "$(cat "$prompt_file")" > "$pass_dir/claude.raw.json" 2> "$pass_dir/claude.stderr"

  if command -v jq >/dev/null 2>&1 && jq -e '.result' "$pass_dir/claude.raw.json" >/dev/null 2>&1; then
    jq -r '.result' "$pass_dir/claude.raw.json" > "$pass_dir/claude-review.md"
  else
    cp "$pass_dir/claude.raw.json" "$pass_dir/claude-review.md"
  fi
}

MODE="plan"
PASSES="1"
BASE_REF="main"
DRY_RUN="0"
RESEARCH_PATH_ARG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --passes)
      PASSES="${2:-}"
      shift 2
      ;;
    --base)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --research)
      RESEARCH_PATH_ARG="${2:-}"
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
    --*)
      die "unknown option: $1"
      ;;
    *)
      PLAN_PATH_ARG="$1"
      shift
      ;;
  esac
done

[ "${MODE}" = "plan" ] || [ "${MODE}" = "implementation" ] || die "--mode must be plan or implementation"
[[ "$PASSES" =~ ^[0-9]+$ ]] || die "--passes must be a number"
[ "$PASSES" -eq 1 ] || die "--passes must be 1; apply fixes from each review round and rerun project-review for another pass"
[ -n "${PLAN_PATH_ARG:-}" ] || die "missing project plan path"

REPO_ROOT="$(repo_root)"
PLAN_PATH="$(resolve_path "$PLAN_PATH_ARG")"
[ -f "$PLAN_PATH" ] || die "project plan not found: $PLAN_PATH"
PLAN_PATH_CANONICAL="$(canonical_file_path "$PLAN_PATH")"

if [ -n "$RESEARCH_PATH_ARG" ]; then
  RESEARCH_PATH="$(resolve_path "$RESEARCH_PATH_ARG")"
  [ -f "$RESEARCH_PATH" ] || die "project research doc not found: $RESEARCH_PATH"
else
  RESEARCH_PATH="$(infer_research_path "$PLAN_PATH")"
fi
if [ -n "$RESEARCH_PATH" ]; then
  RESEARCH_PATH_CANONICAL="$(canonical_file_path "$RESEARCH_PATH")"
else
  RESEARCH_PATH_CANONICAL=""
fi

SLUG="$(safe_slug "$PLAN_PATH")"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_ROOT="${PROJECT_REVIEW_DIR:-/private/tmp/tao-project-reviews}"
ARTIFACT_DIR="$ARTIFACT_ROOT/${SLUG}-${MODE}-${TIMESTAMP}"
TIMEOUT_SECONDS="${REVIEW_TIMEOUT_SECONDS:-600}"
mkdir -p "$ARTIFACT_DIR"

PREVIOUS_REVIEWS=""

for pass in $(seq 1 "$PASSES"); do
  PASS_DIR="$ARTIFACT_DIR/pass-$pass"
  mkdir -p "$PASS_DIR"
  PROMPT_FILE="$PASS_DIR/prompt.md"

  {
    echo "# Tao Project ${MODE} Review"
    echo
    echo "You are reviewing a Tao project ${MODE}. Be direct and actionable."
    echo "Prioritize correctness, missing decisions, unclear sequencing, missing validation, and scope drift."
    echo "Read the included plan, research, roadmap, and directly referenced local context before judging whether docs are stale or inconsistent."
    echo "Check links, historical docs, roadmap status, command names, acceptance paths, and implementation ownership against the included context."
    echo "If important context is missing, report that as a finding instead of doing broad open-ended archaeology."
    echo "Use external research only when the plan depends on a current third-party API, and keep that research narrow."
    echo "Return Markdown with sections: Findings, Questions, Suggested Changes, Deferred Ideas."
    echo "Do not spend space praising the plan or implementation."
    if [ "$pass" -gt 1 ]; then
      echo
      echo "This is review pass $pass of $PASSES. Focus on new issues not already raised below."
      echo
      cat "$PREVIOUS_REVIEWS"
    fi
  } > "$PROMPT_FILE"

  append_file_section "Core Tenets" "$PROMPT_FILE" "$REPO_ROOT/CORE_TENETS.md"
  append_file_section "Agent Guide" "$PROMPT_FILE" "$REPO_ROOT/AGENTS.md"
  if [ -n "$RESEARCH_PATH" ]; then
    append_file_section "Project Research" "$PROMPT_FILE" "$RESEARCH_PATH"
  fi
  append_file_section "Project Plan" "$PROMPT_FILE" "$PLAN_PATH"
  if [ -f "$REPO_ROOT/Docs/Tao Project Roadmap.md" ]; then
    append_file_section "Project Roadmap" "$PROMPT_FILE" "$REPO_ROOT/Docs/Tao Project Roadmap.md"
  fi

  REFERENCED_CONTEXT_FILE="$PASS_DIR/referenced-context-files.txt"
  : > "$REFERENCED_CONTEXT_FILE"
  add_referenced_context_files "$PLAN_PATH" "$REFERENCED_CONTEXT_FILE"
  if [ -n "$RESEARCH_PATH" ]; then
    add_referenced_context_files "$RESEARCH_PATH" "$REFERENCED_CONTEXT_FILE"
  fi
  sort -u -o "$REFERENCED_CONTEXT_FILE" "$REFERENCED_CONTEXT_FILE"
  if [ -s "$REFERENCED_CONTEXT_FILE" ]; then
    {
      echo
      echo "## Directly Referenced Local Context"
      echo
      echo "These local files are linked from the plan or research doc. Use them to catch stale links, scope drift, and historical docs being treated as active work."
    } >> "$PROMPT_FILE"
    while IFS= read -r referenced_path; do
      append_file_section "Referenced: $(relative_repo_path "$referenced_path")" "$PROMPT_FILE" "$referenced_path"
    done < "$REFERENCED_CONTEXT_FILE"
  fi

  if [ "$MODE" = "implementation" ]; then
    append_command_section "Git Status" "$PROMPT_FILE" git -C "$REPO_ROOT" status --short --branch
    append_command_section "Diff Stat Against $BASE_REF" "$PROMPT_FILE" git -C "$REPO_ROOT" diff --stat "$BASE_REF"...HEAD
    append_command_section "Name Status Against $BASE_REF" "$PROMPT_FILE" git -C "$REPO_ROOT" diff --name-status "$BASE_REF"...HEAD
    append_command_section "Committed Diff Against $BASE_REF" "$PROMPT_FILE" git -C "$REPO_ROOT" diff --find-renames "$BASE_REF"...HEAD
    append_command_section "Staged Diff" "$PROMPT_FILE" git -C "$REPO_ROOT" diff --cached
    append_command_section "Unstaged Diff" "$PROMPT_FILE" git -C "$REPO_ROOT" diff
  fi

  if [ "$DRY_RUN" = "1" ]; then
    echo "Dry run: wrote $PROMPT_FILE"
    PREVIOUS_REVIEWS="$PASS_DIR/dry-run-review-placeholder.md"
    echo "_Dry run did not invoke reviewers for pass $pass._" > "$PREVIOUS_REVIEWS"
    continue
  fi

  ( run_codex "$PROMPT_FILE" "$PASS_DIR" ) &
  CODEX_PID="$!"
  ( run_claude "$PROMPT_FILE" "$PASS_DIR" ) &
  CLAUDE_PID="$!"

  CODEX_STATUS=0
  CLAUDE_STATUS=0
  wait_with_timeout "$CODEX_PID" "codex review" "$TIMEOUT_SECONDS" || CODEX_STATUS="$?"
  wait_with_timeout "$CLAUDE_PID" "claude review" "$TIMEOUT_SECONDS" || CLAUDE_STATUS="$?"

  {
    echo "codex_status=$CODEX_STATUS"
    echo "claude_status=$CLAUDE_STATUS"
  } > "$PASS_DIR/status.env"

  PREVIOUS_REVIEWS="$PASS_DIR/combined-review.md"
  {
    echo "# Combined Review Pass $pass"
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
  } > "$PREVIOUS_REVIEWS"

  if [ "$CODEX_STATUS" -ne 0 ] || [ "$CLAUDE_STATUS" -ne 0 ]; then
    echo "One or more reviewers failed. See $PASS_DIR" >&2
    echo "Project review artifacts: $ARTIFACT_DIR"
    echo
    cat "$PREVIOUS_REVIEWS"
    exit 1
  fi
done

echo "Project review artifacts: $ARTIFACT_DIR"
if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run complete; no reviewers were invoked."
elif [ -n "$PREVIOUS_REVIEWS" ] && [ -f "$PREVIOUS_REVIEWS" ]; then
  echo
  cat "$PREVIOUS_REVIEWS"
fi
