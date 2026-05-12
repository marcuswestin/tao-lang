#!/usr/bin/env bash
# Best-effort physical iPhone loop for `just dev`.
# Waits for Metro, installs the app if missing, then opens the direct dev-client URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT/packages/expo-runtime"

PORT="${DEV_METRO_PORT:?tao-lang: DEV_METRO_PORT must be set by just _dev}"
target="${IOS_DEVICE:?tao-lang: IOS_DEVICE must be set by just _dev}"
host="${DEV_HOST:?tao-lang: DEV_HOST must be set by just _dev}"
BUNDLE_ID="com.taolang.exporuntimeexampleapp"
DEV_CLIENT_SCHEME="exp+tao-expo-runtime"

app_is_installed() {
  local apps_output
  apps_output="$(xcrun devicectl device info apps \
    --device "$target" \
    --bundle-id "$BUNDLE_ID" \
    --hide-headers 2>/dev/null || true)"
  grep -Fq "$BUNDLE_ID" <<<"$apps_output"
}

open_dev_client() {
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
    echo "[iphone_launcher] Could not open iPhone dev client URL; continuing dev server." >&2
  fi
}

for _ in {1..240}; do
  if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
    if app_is_installed; then
      echo "[iphone_launcher] App is already installed on ${target}; skipping Expo iOS install." >&2
      open_dev_client no
      exit 0
    fi

    echo "[iphone_launcher] Metro is ready; running Expo iOS install for ${target}." >&2
    if ! npx expo run:ios --device "$target"; then
      echo "[iphone_launcher] Expo iOS install failed; continuing dev server." >&2
      exit 0
    fi

    open_dev_client yes
    exit 0
  fi
  sleep 0.5
done

echo "[iphone_launcher] Metro did not respond on http://127.0.0.1:${PORT}/status; skipping Expo iOS device install." >&2
