#!/usr/bin/env bash
# After Metro is up: iOS Simulator dev client (install if needed, then open URL), then physical iPhone.
# Simulator first, then device, so two `expo run:ios` runs never overlap. Failures are logged only.
# (`expo start --web --ios` exits if no dev build is on the Simulator; Metro stays `expo start --web`.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT/packages/expo-runtime"

PORT="${DEV_METRO_PORT:?tao-lang: DEV_METRO_PORT must be set by just _dev}"
target="${IOS_DEVICE:?tao-lang: IOS_DEVICE must be set by just _dev}"
host="${DEV_HOST:?tao-lang: DEV_HOST must be set by just _dev}"
BUNDLE_ID="com.taolang.exporuntimeexampleapp"
DEV_CLIENT_SCHEME="exp+tao-expo-runtime"

wait_for_metro() {
  local _
  for _ in {1..240}; do
    if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "[ios_launcher] Metro did not respond on http://127.0.0.1:${PORT}/status; skipping iOS native steps." >&2
  return 1
}

simulator_app_is_installed() {
  xcrun simctl get_app_container booted "$BUNDLE_ID" app >/dev/null 2>&1
}

open_simulator_dev_client() {
  local encoded_url payload_url
  encoded_url="http%3A%2F%2F127.0.0.1%3A${PORT}"
  payload_url="${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encoded_url}"
  echo "[ios_sim_launcher] Opening Simulator dev client at http://127.0.0.1:${PORT}." >&2
  if ! xcrun simctl openurl booted "$payload_url" >/dev/null 2>&1; then
    echo "[ios_sim_launcher] Could not open Simulator dev client URL." >&2
  fi
}

launch_simulator() {
  if simulator_app_is_installed; then
    echo "[ios_sim_launcher] Dev client already on booted Simulator; skipping install." >&2
  else
    echo "[ios_sim_launcher] Installing dev client on Simulator (bunx expo run:ios)." >&2
    if ! bunx expo run:ios; then
      echo "[ios_sim_launcher] Expo iOS Simulator install failed; continuing to device." >&2
    fi
  fi
  open_simulator_dev_client
}

device_app_is_installed() {
  local apps_output
  apps_output="$(xcrun devicectl device info apps \
    --device "$target" \
    --bundle-id "$BUNDLE_ID" \
    --hide-headers 2>/dev/null || true)"
  grep -Fq "$BUNDLE_ID" <<<"$apps_output"
}

open_device_dev_client() {
  local terminate_existing="$1"
  local encoded_url payload_url
  encoded_url="http%3A%2F%2F${host}%3A${PORT}"
  payload_url="${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encoded_url}"

  local -a launch_args=(--device "$target")
  if [[ "$terminate_existing" == "yes" ]]; then
    launch_args+=(--terminate-existing)
  fi
  launch_args+=(--payload-url "$payload_url" "$BUNDLE_ID")

  echo "[iphone_launcher] Opening iPhone dev client at http://${host}:${PORT}." >&2
  if ! xcrun devicectl device process launch "${launch_args[@]}" >/dev/null 2>&1; then
    echo "[iphone_launcher] Could not open iPhone dev client URL." >&2
  fi
}

launch_physical_device() {
  if device_app_is_installed; then
    echo "[iphone_launcher] App is already installed on ${target}; skipping Expo iOS install." >&2
    open_device_dev_client no
    return 0
  fi

  echo "[iphone_launcher] Running Expo iOS install for ${target}." >&2
  if ! bunx expo run:ios --device "$target"; then
    echo "[iphone_launcher] Expo iOS device install failed." >&2
    return 0
  fi

  open_device_dev_client yes
}

main() {
  if ! wait_for_metro; then
    exit 0
  fi
  launch_simulator || true
  launch_physical_device || true
}

main
