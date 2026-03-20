import "./_shared-vars.just"

_dev:
    #!{{ ZSH_INIT }}
    while true; do
        just _prefix_strip_parallel "_watch_" \
            {{ _DEV_WATCH_RECIPES }} \
            _steal_focus \
            _r_reloead_q_quit || break;
    done

[private]
_DEV_WATCH_RECIPES := "_watch_grammar _watch_kitchen_sink_build _watch_runtime_reload \
                       _watch_typecheck_extension _watch_esbuild_extension _watch_fmt_justfile"

_watch_all_tests *PATTERNS:
    #!{{ ZSH_INIT }}
    while true; do
        just concurrently-exec-named \
            "shared" "cd packages/shared && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "compiler" "cd packages/compiler && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "formatter" "cd packages/formatter && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "tao-cli" "cd packages/tao-cli && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "headless runtime" "cd packages/headless-test-runtime && just watch-tests {{ PATTERNS }}" \
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
    #!{{ ZSH_INIT }}
    REPLY=""
    echo "Press 'r' to restart or 'q' to exit..."
    while read -k 1; [[ $REPLY != r ]] && [[ $REPLY != q ]]; do :; done
    [[ $REPLY == q ]] && exit 1
    exit 0

_watch_grammar:
    # Watch grammar file and regenerate compiler + IDE syntax on change
    watchexec --restart --watch=packages/parser/tao-grammar.langium -- sh -c "just gen"

_watch_kitchen_sink_build APP_PATH="./Apps/Test Apps/Kitchen Sink/app.tao":
    cd packages/tao-cli && bun run  --watch --no-clear-screen \
        ./tao-cli.ts compile "`pwd`/../../{{ APP_PATH }}" \
            --runtime-dir "../expo-runtime" \
            --std-lib-root "../tao-std-lib" \
            --verbose --watch

_watch_runtime_reload:
    cd packages/expo-runtime \
        && EXPO_NO_CLEAR=true BROWSER="Google Chrome" npx expo start --web \
        # && EXPO_NO_CLEAR=true BROWSER="Google Chrome" npx expo start --ios --web \

_watch_typecheck_extension:
    cd packages/ide-extension && tsc -b tsconfig.json --watch --preserveWatchOutput

_watch_esbuild_extension:
    cd packages/ide-extension && node esbuild.config.ts --watch

_watch_fmt_justfile:
    watchexec --filter '**/*.just' --filter '**/Justfile' -- 'just _fmt_just'
