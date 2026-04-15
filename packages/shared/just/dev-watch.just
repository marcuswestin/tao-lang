import "./_shared-vars.just"

_dev:
    #!{{ ZSH_INIT }}
    open -a "Google Chrome" http://localhost:8081/
    while true; do
        just _prefix_strip_parallel "_watch_" \
            {{ _DEV_WATCH_RECIPES }} \
            _r_reloead_q_quit || break; # consider adding _steal_focus
    done

[private]
_DEV_WATCH_RECIPES := "_watch_grammar _watch_app_build _watch_runtime_reload \
                       _watch_typecheck_extension _watch_esbuild_extension _watch_fmt_justfile"

_watch_all_tests *PATTERNS:
    #!{{ ZSH_INIT }}
    while true; do
        just concurrently-exec-named-watch-tests \
            "shared" "cd packages/shared && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "compiler" "cd packages/compiler && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "formatter" "cd packages/formatter && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "tao-cli" "cd packages/tao-cli && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "headless runtime" "cd packages/headless-test-runtime && just watch '{{ PATTERNS }}'" \
            "extension" "cd packages/ide-extension && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "test apps" "just _watch_test_apps {{ PATTERNS }}" \
            "q Exit" "just _r_reloead_q_quit" || break;
            # "runtime" "cd packages/expo-runtime && just watch {{ PATTERNS }}" \
    done

_steal_focus:
    #!/bin/zsh
    current_app=$(osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true')
    targets=(Simulator "Google Chrome")
    while (( ${#targets[@]} > 0 )); do
        sleep 0.01
        frontmost=$(osascript -e 'tell application "System Events" to name of first process whose frontmost is true')
        if (( ${targets[(Ie)$frontmost]} )); then
            osascript -e "tell application \"$current_app\" to activate"
            targets=(${targets:#$frontmost})
        fi
    done
    sleep 99999999

_r_reloead_q_quit:
    #!{{ ZSH_INIT }}
    REPLY=""
    echo "Press 'r' to restart or 'q' to exit..."
    while read -k 1; [[ $REPLY != r ]] && [[ $REPLY != q ]]; do :; done
    [[ $REPLY == q ]] && exit 1
    exit 0

_watch_grammar:
    # Watch grammar file and regenerate compiler + IDE syntax on change
    watchexec --restart --watch=packages/parser/tao-grammar.langium -- 'just gen'

_watch_test_apps:
    watchexec --restart --watch='Apps/Test Apps/' -- 'just gen'

DEV_APP_PATH := "./Apps/DevApp/DevApp.tao"

# DEV_APP_PATH := "./Apps/Test Apps/Studio/app.tao"
# DEV_APP_PATH := "./Apps/Test Apps/Kitchen Sink/app.tao"

_watch_app_build:
    cd packages/tao-cli && bun run  --watch --no-clear-screen \
        ./tao-cli.ts compile "`pwd`/../../{{ DEV_APP_PATH }}" \
            --runtime-dir "../expo-runtime" \
            --std-lib-root "../tao-std-lib" \
            --verbose --watch

# Run expo on port 8081
_watch_runtime_reload:
    #!/usr/bin/env bash
    set -euo pipefail
    cd packages/expo-runtime
    echo "[runtime_reload] Expo web: http://localhost:8081/"
    EXPO_NO_CLEAR=true BROWSER="none" npx expo start -c --web --port 8081 # omit `start -c` for cache between restarts

_watch_typecheck_extension:
    # One-shot build establishes composite outputs under `.builds/ts-packages/` before watch (avoids TS6305 after `just clean`).
    cd packages/ide-extension && tsc -b tsconfig.json && tsc -b tsconfig.json --watch --preserveWatchOutput

_watch_esbuild_extension:
    cd packages/ide-extension && node esbuild.config.ts --watch

_watch_fmt_justfile:
    watchexec --filter '**/*.just' --filter '**/Justfile' -- 'just _fmt_just'
