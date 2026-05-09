#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() {
  printf "\n==> %s\n" "$1"
}

fail() {
  printf "error: %s\n" "$1" >&2
  exit 1
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

confirm() {
  local answer
  printf "%s [y/N] " "$1"
  read -r answer
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

load_nix_profile() {
  export PATH="/nix/var/nix/profiles/default/bin:$HOME/.nix-profile/bin:$HOME/.local/state/nix/profiles/profile/bin:$PATH"

  if [ -f /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh ]; then
    # shellcheck disable=SC1091
    . /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
  fi

  if [ -f "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
  fi
}

install_nix() {
  load_nix_profile
  if has_command nix; then
    say "Nix already installed: $(nix --version)"
    return
  fi

  cat <<'MSG'
Nix is not installed.

This bootstrap can install Nix using the official installer. This is a
machine-level install that creates or uses /nix and may ask for sudo.
MSG

  if ! confirm "Install Nix now?"; then
    fail "Nix is required. Install Nix, then re-run this script."
  fi

  local os
  os="$(uname -s)"

  case "$os" in
    Darwin)
      say "Installing Nix on macOS"
      curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install | sh
      ;;
    Linux)
      if [ -d /run/systemd/system ]; then
        say "Installing Nix using the multi-user daemon installer"
        curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install | sh -s -- --daemon
      else
        say "Installing Nix using the single-user installer"
        curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install | sh -s -- --no-daemon
      fi
      ;;
    *)
      fail "Unsupported OS for automatic Nix install: $os"
      ;;
  esac

  load_nix_profile
  has_command nix || fail "Nix installed, but this shell cannot find nix. Open a new shell and re-run this script."
}

install_from_nixpkgs() {
  local command_name="$1"
  local attr_name="$2"
  local flake_ref="github:NixOS/nixpkgs/nixpkgs-unstable#$attr_name"

  if has_command "$command_name"; then
    say "$command_name already installed: $($command_name --version 2>/dev/null | head -n 1 || true)"
    return
  fi

  say "Installing $command_name from nixpkgs-unstable"
  nix --extra-experimental-features "nix-command flakes" profile add "$flake_ref"
  load_nix_profile
  has_command "$command_name" || fail "$command_name install finished, but command is still unavailable."
}

add_line_if_missing() {
  local line="$1"
  local file="$2"

  touch "$file"
  if ! grep -qxF "$line" "$file"; then
    {
      printf "\n# Added by tao-lang bootstrap\n"
      printf "%s\n" "$line"
    } >> "$file"
  fi
}

configure_direnv_hook() {
  local shell_name
  shell_name="$(basename "${SHELL:-}")"

  case "$shell_name" in
    zsh)
      if ! grep -qs 'direnv hook zsh' "$HOME/.zshrc"; then
        if confirm "Add direnv's zsh hook to ~/.zshrc?"; then
          add_line_if_missing 'eval "$(direnv hook zsh)"' "$HOME/.zshrc"
        fi
      fi
      ;;
    bash)
      if ! grep -qs 'direnv hook bash' "$HOME/.bashrc" "$HOME/.bash_profile" 2>/dev/null; then
        if confirm "Add direnv's bash hook to ~/.bashrc?"; then
          add_line_if_missing 'eval "$(direnv hook bash)"' "$HOME/.bashrc"
        fi
      fi
      ;;
  esac
}

main() {
  cd "$REPO_ROOT"

  has_command curl || fail "curl is required to bootstrap Nix and devenv."

  install_nix
  install_from_nixpkgs devenv devenv
  install_from_nixpkgs direnv direnv

  say "Allowing repo direnv configuration"
  direnv allow "$REPO_ROOT"
  configure_direnv_hook

  say "Running Tao setup inside devenv"
  devenv shell -- ./agent setup

  say "Bootstrap complete"
}

main "$@"
