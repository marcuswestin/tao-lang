#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
boot_timeout_seconds="${ANDROID_EMULATOR_BOOT_TIMEOUT_SECONDS:-180}"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "[android_emulator] Missing '${command_name}' in PATH. Run inside the Tao devenv shell." >&2
    exit 1
  fi
}

running_emulator_serial() {
  adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }'
}

safe_log_name() {
  printf '%s' "$1" | tr -c 'A-Za-z0-9_.-' '_'
}

choose_default_avd() {
  local avd
  avd="$(emulator -list-avds | sed '/^[[:space:]]*$/d' | head -n 1)"
  if [[ -z "$avd" ]]; then
    echo "[android_emulator] No Android Virtual Devices found." >&2
    echo "[android_emulator] Create one in Android Studio or with avdmanager, then rerun this recipe." >&2
    exit 1
  fi
  printf '%s\n' "$avd"
}

wait_for_boot() {
  local emulator_pid="$1"
  local serial=""
  local booted=""

  for ((second = 0; second < boot_timeout_seconds; second++)); do
    serial="$(running_emulator_serial || true)"
    if [[ -n "$serial" ]]; then
      booted="$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      if [[ "$booted" == "1" ]]; then
        echo "[android_emulator] Emulator is booted: ${serial}." >&2
        return 0
      fi
    fi

    if ! kill -0 "$emulator_pid" >/dev/null 2>&1 && [[ -z "$serial" ]]; then
      echo "[android_emulator] Emulator process exited before adb saw a device." >&2
      return 1
    fi

    sleep 1
  done

  echo "[android_emulator] Emulator is still starting after ${boot_timeout_seconds}s; leaving it running." >&2
  return 0
}

main() {
  require_command adb
  require_command emulator

  local running
  running="$(running_emulator_serial || true)"
  if [[ -n "$running" ]]; then
    echo "[android_emulator] Emulator already running: ${running}." >&2
    return 0
  fi

  if [[ -z "$target" ]]; then
    target="$(choose_default_avd)"
  fi

  local log_file
  log_file="${TMPDIR:-/tmp}/tao-android-emulator-$(safe_log_name "$target").log"

  echo "[android_emulator] Starting Android emulator '${target}'." >&2
  echo "[android_emulator] Logs: ${log_file}" >&2
  nohup emulator -avd "$target" >"$log_file" 2>&1 &
  wait_for_boot "$!"
}

main
