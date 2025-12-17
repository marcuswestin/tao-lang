import "packages/shared/just/setup.just"

# Dev commands
##############

# Print available commands
help:
    just _print_help

# Print extra agent commands
agent-help:
    echo "\n> Available agent commands:\n"
    just --dump | grep -B 1 '^_agent'  | grep -v '^--$'

# Dev Loops
###########

# Build and run all components
dev:
    just _dev

# Run tests for the directory we're in
[no-cd]
test *PATTERNS:
    @-just test-prep 2> /dev/null # Optionally implemented in executing directory Justfile
    bun test --reporter=dot {{ PATTERNS }}

test-all *PATTERNS:
    cd packages/shared-tools && just test {{ PATTERNS }}
    cd packages/shared && just test {{ PATTERNS }}
    cd packages/compiler && just test {{ PATTERNS }}
    cd packages/tao-cli && just test {{ PATTERNS }}
    cd packages/ide-extension && just test {{ PATTERNS }}
    cd packages/expo-runtime && just test {{ PATTERNS }}

watch-tests2 *PATTERNS:
    #!{{ SHELL_INIT }}
    while true; do
        just concurrently-named \
            "bun" "bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "jest" "cd packages/expo-runtime && just test --watch {{ PATTERNS }}" \
            "q Exit" "just _die_on_r_or_q" || break;
    done

watch-tests *PATTERNS:
    #!{{ SHELL_INIT }}
    while true; do
        just concurrently-named \
            "tools" "cd packages/shared-tools && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "shared" "cd packages/shared && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "compiler" "cd packages/compiler && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "tao-cli" "cd packages/tao-cli && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "extension" "cd packages/ide-extension && bun test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "runtime" "cd packages/expo-runtime && just test --watch --silent --reporter=dot {{ PATTERNS }}" \
            "q Exit" "just _die_on_r_or_q" || break;
    done

# Check that builds work
check-run-builds:
    ./.builds/tao-cli help

# Run and Build commands
########################

# Build and run Tao CLI with given arguments
tao *ARGS:
    cd packages/tao-cli && just build
    echo "\n> Run: ./.builds/tao-cli "$@"\n"
    ./.builds/tao-cli "$@"
    echo

# Build everything
[no-quiet]
build:
    cd packages/shared-tools && just build
    cd packages/shared && just build
    cd packages/compiler && just build
    cd packages/tao-cli && just build
    cd packages/expo-runtime && just build
    cd packages/ide-extension && just build
    just _agent-gen-mise-tasks

# Build and install the extension to cursor
extension-build-package-and-install:
    cd packages/ide-extension && just build && just package-and-install

# Run full battery of checks and builds. Meant to be run before committing.
pre-commit:
    just _pre-commit

# Format all files
fmt:
    just _fmt

# Check all code: lint, typecheck, etc.
check:
    just _check

# Setup development environment
setup:
    echo "\tSetup Tao Lang dev environment:"
    just _install_mise && just _do_setup

reload-extension:
    cd packages/ide-extension && just run

install-mise-deps:
    mise install

# Powerful helper commands
##########################

# Run recipes in parallel. All die when any exits. Output prefixed with recipe name.
parallel *RECIPES:
    just prefix-strip-parallel "" {{ RECIPES }}

# Run recipes in parallel with prefix stripping from labels.
prefix-strip-parallel PREFIX *RECIPES:
    just _prefix-strip-parallel {{ PREFIX }} {{ RECIPES }}

# Usage: just concurrently "<cmd1> <args>" "<2cmd> <args>"
[positional-arguments]
concurrently *CMDS:
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} "$@"

# Usage: just concurrently-named "<name 1>" "<cmd 1>" "<name 2>" "<cmd 2>" ...
[positional-arguments]
concurrently-named *NAMES_AND_CMDS:
    #!{{ SHELL_INIT }}
    names=() && cmds=()
    while (( {{ NUM_ARGS }} >= 2 )); do
        names+=("$1") && cmds+=("$2")
        shift 2
    done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

# LLM & Agent Setups
####################

# Run mise MCP server
mcp-run:
    screen -dmS mise-mcp mise mcp

# Halt mise MCP server
mcp-halt:
    screen -X -S mise-mcp quit

# Generate mise-gen-just-commands.toml from this file
gen-mise-tasks:
    cd packages/shared-tools && bun tools-src/gen-mise-tasks.ts

#
#
####################################
############# Internal #############
####################################
#
#

MISE_CMD := "~/.local/bin/mise"

# Dev Commands
##############

DEV_WATCH_RECIPES := "_watch-grammar _watch-kitchen-sink-build _watch-runtime-reload \
                       _watch-typecheck-extension _watch-esbuild-extension _watch-fmt-justfile"

_dev:
    #!{{ SHELL_INIT }}
    while true; do
        just _prefix-strip-parallel "_watch-" \
            {{ DEV_WATCH_RECIPES }} \
            _steal_focus \
            _die_on_r_or_q || break;
    done

_steal_focus:
    #!/bin/zsh
    app=$(osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true')
    last_frontmost=""
    change_count=0
    while (( change_count < 5 )); do
        sleep 0.01
        frontmost=$(osascript -e 'tell application "System Events" to name of first process whose frontmost is true')
        osascript -e "tell application \"$app\" to activate"
        if [[ "$frontmost" != "$last_frontmost" ]]; then
            (( change_count++ ))
            last_frontmost="$frontmost"
            echo "Frontmost changed to $frontmost"
        fi
    done
    sleep 999999

_die_on_r_or_q:
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
        ./tao-cli.ts compile "`pwd`/../../{{ APP_PATH }}" --verbose --watch \

_watch-runtime-reload:
    cd packages/expo-runtime \
        && EXPO_NO_CLEAR=true BROWSER="Google Chrome" npx expo start --ios --web \

_watch-typecheck-extension:
    cd packages/ide-extension && tsc -b tsconfig.json --watch --preserveWatchOutput

_watch-esbuild-extension:
    cd packages/ide-extension && node esbuild.mjs --watch

_watch-fmt-justfile:
    watchexec --filter '**/*.just' --filter '**/Justfile' -- 'just _fmt_just'

_pre-commit:
    echo "\n> Run pre-commit checks...\n"
    echo "> Stashing non-staged changes..." && git stash push --keep-index --include-untracked
    echo "> Running code checks..." && just check
    echo "> Building everything..." && just test
    echo "> Checking builds..." && just check-run-builds
    echo "> Pre-commit checks complete. Unstashing changes..." && git stash pop

_prefix-strip-parallel PREFIX *RECIPES:
    #!{{ SHELL_INIT }}
    p="{{ PREFIX }}"; recipes=({{ RECIPES }})
    for r in "${recipes[@]}"; do cmds+=("just $r"); names+=("${r#$p}"); done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

NUM_ARGS := "$#"
CONCURRENTLY_COLORS := '--prefix-colors "#4FC3F7,#81C784,#FFD54F,#FF8A65,#BA68C8,#4DD0E1,#F06292,#AED581,#7986CB,#FFB74D"'
CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS := "--success first"
CONCURRENTLY_EXIT_ALL_TOGETHER := "--kill-others --kill-others-on-fail"
CONCURRENTLY_RUN_AND_STOP_ALL_CMD := "" + "./packages/shared-tools/node_modules/.bin/concurrently" + " " + CONCURRENTLY_COLORS + " " + CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS + " " + CONCURRENTLY_EXIT_ALL_TOGETHER

# Process Filtering
###################

# Grep my relevant processes
psgrep *PATTERN:
    just _ps-filter | grep {{ PATTERN }}

# Print my most relevant processes, with a filter
psrelevant *FILTERS:
    just _ps-filter \
        "/Library/Developer/CoreSimulator/" "/System/Library/" \
        "Spotify.app|Google Chrome.app" "Cursor.app" "ChatGPT" \
        "Brave Browser" "/bin/node$" " Cursor Helper" " aslmanager$" \
        " assetsd$" \
        {{ FILTERS }}

# Print my relevant processes, with a filter
ps *FILTERS:
    just _ps-filter {{ FILTERS }}

# Print my processes, with a filter
[positional-arguments]
_ps-filter *FILTERS:
    #!/bin/bash
    max_pid=$(ps -axo pid | sort -rn | head -1)
    # Create arguments regex, or default to unmatchable regex
    regex=$(IFS='|'; echo "${*:-{{ PS_UNMATCHABLE_REGEX }}}")
    ps -eo user,pid,ppid,args,comm \
        | awk '{ pid=$2; ppid=$3 } pid > 1000 && ppid != 1' \
        | awk -v max_pid="$max_pid" 'pid < max_pid' \
        | grep -vE "^\w+(\d\s)+ /{{ PS_FILTER_LIBRARY }}|{{ PS_FILTER_SYSTEM }}|{{ PS_FILTER_USR }}/" \
        | grep -vE "$regex" \
        | sort -k 2 -n \
        || true;

PS_FILTER_LIBRARY := "(Library/Apple/System)"
PS_FILTER_SYSTEM := "(System/(Library|Volumes|iOSSupport|Cryptexes))"
PS_FILTER_USR := "(usr/(sbin|libexec))"
PS_UNMATCHABLE_REGEX := "$^"

# Formatting and linting
########################

_fmt:
    just _fmt_just
    cd packages/shared-tools && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt 1> /dev/null 2>&1
    {{ MISE_CMD }} fmt 1> /dev/null 2>&1
    oxlint --fix 1> /dev/null 2>&1

_fmt_just:
    find . -type f \( -name "Justfile" -o -name "*.just" \) -exec just --fmt --unstable --justfile {} \; 1> /dev/null 2>&1

[no-quiet]
fix:
    cd packages/compiler && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/tao-cli && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/shared-tools && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint --fix
    cd packages/expo-runtime && bunx eslint --fix

[no-quiet]
_check:
    oxlint
    dprint check
    cd packages/compiler && tsc --noEmit --noUnusedLocals
    cd packages/tao-cli && tsc --noEmit --noUnusedLocals
    cd packages/shared-tools && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint
    cd packages/expo-runtime && bunx eslint

# Help & Setup
##############

_print_help:
    echo "\nTo ended Tao Dev Env, run either of:\n"
    echo "    enter-tao"
    echo "    et"
    echo "\n For more commands, run:\n"
    echo "    just <recipe>"
    echo
    just --list --unsorted --color=always | grep -v "_"
    echo

_do_setup:
    #!{{ SHELL_INIT }}
    eval "$({{ MISE_CMD }} activate zsh)"
    just _configure_mise
    just _configure_zsh
    just _install_deps
    just _install_ide_extensions
    just _print_setup_done

_install_mise:
    @ echo "\tInstall mise..."
    @ curl -sS https://mise.run | MISE_VERSION=v2025.12.1 sh 2> /dev/null
    @ {{ MISE_CMD }} trust --quiet

_configure_mise:
    @ echo "\tConfigure mise..."
    @ mise trust --quiet
    @ mise install 2> /dev/null
    @ mise doctor 1> /dev/null

_configure_zsh:
    #!{{ SHELL_INIT }}
    echo "\tConfigure zsh..."
    add_if_missing() { local line="$1" file="$2"; grep -qxF "$line" "$file" || echo "\n# Added by tao-lang dev env '_configure_zsh' justfile rule\n$line" >> "$file"; }
    add_if_missing "alias et=enter-tao && alias enter-tao='echo \" * Enter Tao Lang dev env * \" && cd $PWD && source .config/enter-tao-dev-env-source-configure.zsh'" ~/.zshrc

_install_deps:
    @ echo "\tInstall dependencies..."
    @ curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    @ mise install 2> /dev/null

_install_ide_extensions:
    @ echo "\tInstall IDE extensions..."
    @ jq -r '.recommendations[]' .vscode/extensions.json | xargs -L 1 cursor --force --install-extension 1> /dev/null

_print_setup_done:
    @ echo "\n\t*** Done ***"
    @ echo "\trestart your terminal and run:\n"
    @ echo "\t\tenter-tao && just help"
    @ echo

#
##########################
# Agent Generated Commands
# ------------------------
# These are commands generated by agents, to be used by the agents themselves.
# If a command is needed that doesn't exist, they need to ask for permission before adding it.

# Run tests
_agent-test *args:
    test {{ args }}

# Format and lint code
_agent-fmt *args:
    fmt {{ args }}

# Lint code
_agent-lint *args:
    check {{ args }}

# Generate mise-gen-just-commands.toml from this file
_agent-gen-mise-tasks *args:
    just gen-mise-tasks {{ args }}

# Execute git commands:
_agent-git *args:
    git {{ args }}

# Execute mise commands:
_agent-mise *args:
    mise {{ args }}

# Print a file (read-only helper for AI agents).
_agent-cat *args:
    cat "{{ args }}"

# Ripgrep a pattern in an optional path (defaults to current dir).
_agent-rg *args:
    rg "{{ args }}" || true
