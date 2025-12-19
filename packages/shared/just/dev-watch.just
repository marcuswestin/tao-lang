import "./_shared-vars.just"

_dev:
    #!{{ SHELL_INIT }}
    while true; do
        just _prefix-strip-parallel "_watch-" \
            {{ _DEV_WATCH_RECIPES }} \
            _steal_focus \
            _r_reloead_q_quit || break;
    done

[private]
_DEV_WATCH_RECIPES := "_watch-grammar _watch-kitchen-sink-build _watch-runtime-reload \
                       _watch-typecheck-extension _watch-esbuild-extension _watch-fmt-justfile"

_watch-all-tests *PATTERNS:
    #!{{ SHELL_INIT }}
    while true; do
        just concurrently-named \
            "tools" "cd packages/shared-tools && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "shared" "cd packages/shared && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "compiler" "cd packages/compiler && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "tao-cli" "cd packages/tao-cli && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "extension" "cd packages/ide-extension && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "runtime" "cd packages/expo-runtime && just watch-tests {{ PATTERNS }}" \
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
    #!{{ SHELL_INIT }}
    REPLY=""
    echo "Press 'r' to restart or 'q' to exit..."
    while read -k 1; [[ $REPLY != r ]] && [[ $REPLY != q ]]; do :; done
    [[ $REPLY == q ]] && exit 1
    exit 0

_watch-grammar:
    cd packages/compiler && just watch-grammar

_watch-kitchen-sink-build APP_PATH="./Apps/Kitchen Sink/Kitchen Sink.tao":
    cd packages/tao-cli && bun run  --watch --no-clear-screen \
        ./tao-cli.ts compile "`pwd`/../../{{ APP_PATH }}" \
            --runtime-dir "../expo-runtime" \
            --verbose --watch

_watch-runtime-reload:
    cd packages/expo-runtime \
        && EXPO_NO_CLEAR=true BROWSER="Google Chrome" npx expo start --ios --web \

_watch-typecheck-extension:
    cd packages/ide-extension && tsc -b tsconfig.json --watch --preserveWatchOutput

_watch-esbuild-extension:
    cd packages/ide-extension && node esbuild.mjs --watch

_watch-fmt-justfile:
    watchexec --filter '**/*.just' --filter '**/Justfile' -- 'just _fmt_just'
