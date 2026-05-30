#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
boot_timeout_seconds="${ANDROID_EMULATOR_BOOT_TIMEOUT_SECONDS:-180}"
default_avd_name="${ANDROID_EMULATOR_AVD_NAME:-tao_default}"
default_avd_device="${ANDROID_EMULATOR_AVD_DEVICE:-pixel_6}"

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

# Find an installed system image and print it as an sdkmanager package id
# (e.g. "system-images;android-36;google_apis_playstore;arm64-v8a").
installed_system_image_package() {
  local sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  if [[ -z "$sdk_root" || ! -d "$sdk_root/system-images" ]]; then
    return 1
  fi

  local image_dir
  while IFS= read -r image_dir; do
    [[ -z "$image_dir" ]] && continue
    if [[ -f "$image_dir/system.img" || -f "$image_dir/build.prop" ]]; then
      local rel="${image_dir#"$sdk_root"/system-images/}"
      # rel looks like "android-36/google_apis_playstore/arm64-v8a"
      printf 'system-images;%s\n' "${rel//\//;}"
      return 0
    fi
  done < <(find -L "$sdk_root/system-images" -mindepth 3 -maxdepth 3 -type d 2>/dev/null | sort)

  return 1
}

create_default_avd() {
  require_command avdmanager

  local system_image
  system_image="$(installed_system_image_package || true)"
  if [[ -z "$system_image" ]]; then
    echo "[android_emulator] No installed Android system image found." >&2
    echo "[android_emulator] Ensure the devenv Android system image is installed, then rerun this recipe." >&2
    exit 1
  fi

  echo "[android_emulator] No Android Virtual Devices found." >&2
  echo "[android_emulator] Creating AVD '${default_avd_name}' from '${system_image}'." >&2
  # avdmanager prompts to create a custom hardware profile; decline with "no".
  echo "no" | avdmanager create avd \
    --name "$default_avd_name" \
    --package "$system_image" \
    --device "$default_avd_device" \
    --force >&2

  printf '%s\n' "$default_avd_name"
}

choose_default_avd() {
  local avd
  avd="$(emulator -list-avds | sed '/^[[:space:]]*$/d' | head -n 1)"
  if [[ -z "$avd" ]]; then
    avd="$(create_default_avd)" || exit 1
  fi
  if [[ -z "$avd" ]]; then
    echo "[android_emulator] Failed to determine an AVD to start." >&2
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
