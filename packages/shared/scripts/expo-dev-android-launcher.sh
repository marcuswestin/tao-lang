#!/usr/bin/env bash
# After Metro is up: launch the dev client on a running Android emulator/device.
# Installs the dev build with `expo run:android` only when the app is missing, then
# opens the dev-client URL. No device running means this is a no-op. Failures are logged only.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT/packages/expo-runtime"

PORT="${DEV_METRO_PORT:?tao-lang: DEV_METRO_PORT must be set by just _dev}"
PACKAGE_ID="com.taolang.exporuntimeexampleapp"
DEV_CLIENT_SCHEME="exp+tao-expo-runtime"

wait_for_metro() {
  local _
  for _ in {1..240}; do
    if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "[android_launcher] Metro did not respond on http://127.0.0.1:${PORT}/status; skipping Android steps." >&2
  return 1
}

running_device_serial() {
  adb devices | awk '$1 != "List" && $2 == "device" { print $1; exit }'
}

app_is_installed() {
  local serial="$1"
  adb -s "$serial" shell pm list packages "$PACKAGE_ID" 2>/dev/null | tr -d '\r' | grep -Fq "package:${PACKAGE_ID}"
}

open_dev_client() {
  local serial="$1"
  local encoded_url payload_url
  encoded_url="http%3A%2F%2F127.0.0.1%3A${PORT}"
  payload_url="${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encoded_url}"

  echo "[android_launcher] Opening Android dev client at http://127.0.0.1:${PORT}." >&2
  if ! adb -s "$serial" shell am start -a android.intent.action.VIEW -d "$payload_url" >/dev/null 2>&1; then
    echo "[android_launcher] Could not open Android dev client URL." >&2
  fi
}

main() {
  if ! command -v adb >/dev/null 2>&1; then
    echo "[android_launcher] 'adb' not in PATH; skipping Android dev client launch." >&2
    exit 0
  fi

  if ! wait_for_metro; then
    exit 0
  fi

  local serial
  serial="$(running_device_serial || true)"
  if [[ -z "$serial" ]]; then
    echo "[android_launcher] No running Android emulator/device; skipping. Start one with 'just android-run-simulator'." >&2
    exit 0
  fi

  # Route the device's localhost:PORT back to the host Metro server.
  adb -s "$serial" reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null 2>&1 || true

  if app_is_installed "$serial"; then
    echo "[android_launcher] Dev client already installed on ${serial}; skipping build." >&2
  else
    # `expo run:android` matches `--device` against the AVD/model name, not the adb
    # serial; omit it so Expo auto-selects the first booted device (our `$serial`).
    echo "[android_launcher] Installing dev client on ${serial} (bunx expo run:android)." >&2
    if ! bunx expo run:android; then
      echo "[android_launcher] Expo Android install failed." >&2
      exit 0
    fi
  fi

  open_dev_client "$serial"
}

main
