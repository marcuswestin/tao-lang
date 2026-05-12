#!/usr/bin/env bash
# Prints this machine's iPhone-reachable IPv4 address (stdout).
# Falls back to localhost if none found. Supports macOS and Linux.
set -euo pipefail
case "$(uname -s)" in
Darwin)
  # A cabled iPhone can reach Metro/InstantDB over the active USB/link-local
  # interface even when the Mac's default route points at Wi-Fi or a VPN.
  ip=$(ifconfig 2>/dev/null | awk '
    function emit_if_preferred() {
      if (iface != "" && active == 1 && ip ~ /^169[.]254[.]/ && iface !~ /^(lo|awdl|llw|utun|bridge|gif|stf)/) {
        print ip
        found = 1
        exit
      }
    }
    /^[[:alnum:]_.-]+: flags=/ {
      emit_if_preferred()
      iface = $1
      sub(":", "", iface)
      ip = ""
      active = 0
      next
    }
    /^[[:space:]]*inet / && $2 != "127.0.0.1" { ip = $2 }
    /^[[:space:]]*status: active/ { active = 1 }
    END {
      if (found != 1) {
        emit_if_preferred()
      }
    }
  ' || true)
  if [[ -n "${ip:-}" ]]; then
    echo "$ip"
    exit 0
  fi

  iface=$(route -n get default 2>/dev/null | awk '/interface: / {print $2}')
  if [[ -n "${iface:-}" ]]; then
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      exit 0
    fi
  fi
  for i in en{0..20}; do
    ip=$(ipconfig getifaddr "$i" 2>/dev/null || true)
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      exit 0
    fi
  done
  ;;
Linux)
  if command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }')
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      exit 0
    fi
  fi
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{ print $1 }')
    if [[ -n "${ip:-}" && "$ip" != "127.0.0.1" ]]; then
      echo "$ip"
      exit 0
    fi
  fi
  ;;
esac
echo "localhost"
