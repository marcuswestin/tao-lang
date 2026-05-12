import "./_shared-vars.just"

_dev DEVICE APP:
    #!{{ ZSH_INIT }}
    ROOT="{{ justfile_dir() }}"
    export DEV_HOST="$(bash "$ROOT/packages/shared/scripts/lan-ipv4.sh")"
    export DEV_APP="{{ APP }}"
    export IOS_DEVICE="{{ DEVICE }}"
    export DEV_METRO_PORT="{{ DEV_METRO_PORT }}"
    export LOCAL_INSTANTDB_APP_ID="{{ LOCAL_INSTANTDB_APP_ID }}"
    just deps gen
    echo "compile"
    just _compile_dev_app
    echo "local InstantDB (Docker)"
    just instantdb-local up
    echo 'InstantDB stays in Docker when you stop `just dev` (compose `up -d` is detached). Run `just instantdb-local down` to tear it down.'
    just expo-runtime prebuild
    echo "start dev loops (press 'r' to restart or 'q' to quit)"
    while true; do
        just concurrently-exec-named-dev-loop \
            "grammar" "watchexec --restart --watch=packages/parser/tao-grammar.langium -- just gen" \
            "app_build" "just _compile_dev_app --watch" \
            "runtime_reload" "open -a 'Google Chrome'; cd packages/expo-runtime && exec env BROWSER='Google Chrome' bunx expo start --web --port {{ DEV_METRO_PORT }}" \
            "iphone_app_install" "bash packages/shared/scripts/expo-dev-iphone-launcher.sh || true; tail -f /dev/null" \
            "typecheck_extension" "cd packages/ide-extension && tsc -b tsconfig.json && tsc -b tsconfig.json --watch --preserveWatchOutput" \
            "esbuild_extension" "cd packages/ide-extension && node esbuild.config.ts --watch" \
            "fmt_justfile" "watchexec --filter '**/*.just' --filter '**/Justfile' -- just _fmt_just" \
            "dev_control" "just _r_reloead_q_quit" || break
    done

_watch_all_tests *PATTERNS:
    #!{{ ZSH_INIT }}
    while true; do
        just concurrently-exec-named-watch-tests \
            "shared" "cd packages/shared && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "compiler" "cd packages/compiler && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "formatter" "cd packages/formatter && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "tao-cli" "cd packages/tao-cli && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "headless runtime" "just headless-test-runtime watch '{{ PATTERNS }}'" \
            "extension" "cd packages/ide-extension && bun test --watch --no-clear-screen '{{ PATTERNS }}'" \
            "test apps" "just _watch_test_apps {{ PATTERNS }}" \
            "q Exit" "just _r_reloead_q_quit" || break;
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
    # concurrently does not give children a TTY on stdin; read the controlling terminal explicitly.
    if [[ -r /dev/tty ]]; then
        exec < /dev/tty
    else
        echo "_r_reloead_q_quit: no /dev/tty; cannot read keys (leave this job running or Ctrl+C the whole dev stack)" >&2
        tail -f /dev/null
    fi
    while read -k 1; [[ $REPLY != r ]] && [[ $REPLY != q ]]; do :; done
    [[ $REPLY == q ]] && exit 1
    exit 0

_watch_test_apps:
    watchexec --restart --watch='Apps/Test Apps/' -- 'just gen'

[positional-arguments]
_compile_dev_app *ARGS:
    #!{{ ZSH_INIT }}
    INSTANT_ENV="{{ justfile_dir() }}/packages/local-instantdb/.env"
    APP_PATH="${DEV_APP:?tao-lang: DEV_APP must be set by just _dev}"
    HOST="${DEV_HOST:?tao-lang: DEV_HOST must be set by just _dev}"
    APP_ID="${LOCAL_INSTANTDB_APP_ID:?tao-lang: LOCAL_INSTANTDB_APP_ID must be set by just _dev}"
    # shellcheck disable=SC1091
    source "$INSTANT_ENV"
    just tao compile "$APP_PATH" \
        "$@" \
        --runtime-dir ./packages/expo-runtime \
        --std-lib-root ./packages/tao-std-lib \
        --verbose \
        --app provider.name=InstantDB \
        --app "provider.appId=$APP_ID" \
        --app "provider.apiURI=http://${HOST}:${INSTANT_PORT}" \
        --app "provider.websocketURI=ws://${HOST}:${INSTANT_PORT}/runtime/session"
