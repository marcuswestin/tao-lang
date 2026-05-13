#!/usr/bin/env bash
# Fails fast when the fixed Metro port is already occupied before `just dev` starts Expo.
set -euo pipefail

port="${1:-${DEV_METRO_PORT:-8081}}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "[metro_port_guard] lsof is not available; cannot check port ${port} before starting Metro." >&2
  echo "[metro_port_guard] Continuing without a port check; Metro may still fail if ${port} is busy." >&2
  exit 0
fi

pids=()
while IFS= read -r pid; do
  [[ -n "$pid" ]] && pids+=("$pid")
done < <(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u)

if (( ${#pids[@]} == 0 )); then
  exit 0
fi

echo "[metro_port_guard] Port ${port} is already listening before just dev can start Metro." >&2
echo "[metro_port_guard] Stop the existing process, then rerun just dev." >&2
for pid in "${pids[@]}"; do
  command_text="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  cwd_text="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | awk '/^n/ { print substr($0, 2); exit }' || true)"
  echo "[metro_port_guard] pid=${pid}" >&2
  [[ -n "$cwd_text" ]] && echo "[metro_port_guard]   cwd=${cwd_text}" >&2
  [[ -n "$command_text" ]] && echo "[metro_port_guard]   command=${command_text}" >&2
done
echo "[metro_port_guard] Example: kill ${pids[*]}" >&2
exit 1
