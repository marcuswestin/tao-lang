---
name: expo-ios-dev-client
description: Guides Tao Expo physical-iPhone workflow: Metro startup, app install/open flow, dev-client URL routing, launcher patching, and iOS native config gotchas.
---

# Expo iOS Dev Client

## Use this skill when

- Working on physical iPhone install/open behavior.
- Debugging `just dev roPhone`, Expo `run:ios --device`, or Metro discovery issues.
- Changing Expo dev-client networking, native iOS config, or related scripts.

## Primary commands

1. Device install/build: root `just iphone <device>` or package `just device <device>`.
2. Full Tao dev loop: root `just dev roPhone` or `just dev roPhone "./Apps/DevApp/DevApp.tao"`.
3. Manual fallback URL: `just expo-runtime device-url`.

## Repo flow expectations

- `just dev` compiles Tao app output, starts local InstantDB, starts Expo/Metro, then best-effort installs or opens the iPhone app.
- `packages/shared/scripts/expo-dev-iphone-launcher.sh` is a one-shot helper, not a watch loop.
- Device target comes from the root `just dev` / `just iphone` `DEVICE` argument and is passed to Expo as `--device`.
- `packages/shared/scripts/lan-ipv4.sh` should prefer the active macOS `169.254.x.x` iPhone/link-local interface over the default-route Wi-Fi/VPN address.
- Launcher failures must not kill the dev server.
