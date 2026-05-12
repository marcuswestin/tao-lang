---
name: nix-devenv
description: Explains Tao Lang Nix/devenv setup, bootstrap flow, and Darwin Xcode vs Nix toolchain boundaries. Use for `devenv.nix` edits, shared CLI package additions, or PATH/compiler/SDK conflicts.
---

# Nix / devenv

## Core facts

1. Bootstrap is `.config/bootstrap-dev-env.sh`: install Nix/devenv/direnv, run `direnv allow`, then `devenv shell -- ./agent setup`.
2. Daily development should run inside direnv/devenv with `TAO_DEVENV=1`.
3. Shared CLI tools belong in `devenv.nix` `packages`; JavaScript runtime is pinned by `languages.javascript.package`.
4. On Darwin, Tao keeps native iOS builds on Xcode by using `stdenvNoCC` and `apple.sdk = null`.

## When debugging native iOS toolchain issues

If Expo/Xcode emits clang flag, linker-driver, or SDK mismatch errors:

- Verify `devenv.nix` still sets Darwin `stdenvNoCC` and `apple.sdk = null`.
- Check `command -v clang`, `xcrun --find clang`, and `xcode-select -p` resolve to Xcode/system paths.
- Avoid adding long-lived PATH/SDK wrapper hacks until the owner-layer cause is confirmed.

## Validation

- After editing `devenv.nix`: `devenv shell -- echo ok`.
- Reload shell state (`direnv reload` or a fresh shell) before trusting compiler/PATH results.
- If the investigation keeps looping, switch to `skills/multi-pass-debugging`.
