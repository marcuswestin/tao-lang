set dotenv-load := true
set quiet := true

# Dev commands
##############

# Print available commands
help:
    just _print_help

# Print extra agent commands
agent-help:
    echo "\n> Available agent commands:\n"
    just --dump | grep -B 1 '^_agent'  | grep -v '^--$'

# Enter development
dev: mcp-run
    cursor .

# Kitchen Sink Dev App Watcher
##############################

watch-kitchen-sink:
    watchexec --restart --watch=Justfile -- just _watch-kitchen-sink

[parallel]
_watch-kitchen-sink: _watch-langium-generate _watch-cli-compile-build _watch-runtime-build

_watch-langium-generate:
    cd packages/compiler \
        && bunx langium generate --watch --mode=development \
        | awk '{ print "\033[36mlangium-gen  > \033[0m" $0 }'

_watch-cli-compile-build APP_PATH="./Apps/KitchenSink/KitchenSink.tao":
    cd packages/tao-cli \
        && bun run  --watch --no-clear-screen ./tao-cli.ts compile {{ APP_PATH }} \
        | awk '{ print "\033[32mcli-compile  > \033[0m" $0 }'

_watch-runtime-build:
    cd packages/expo-runtime \
        && bunx expo start --ios --web 2>&1 \
        | awk '{ print "\033[35mexpo-runtime > \033[0m" $0 }'

# Run tests
[no-quiet]
test:
    cd packages/compiler && just test
    cd packages/ide-extension && just test
    cd packages/tao-cli && just test
    cd packages/shared-tools && bun test
    cd packages/expo-runtime && just test

# Check that builds work
check-run-builds:
    ./.builds/tao help

# Run and Build commands
########################

# Start tao expo runtime
start-runtime:
    cd packages/expo-runtime && just run

# Run Tao Studio app
run-studio:
    cd packages/tao-cli && bun run tao-cli.ts run-app "Apps/Tao Studio/Tao Studio.tao"

# Build and run Tao CLI with given arguments
tao args:
    just build
    echo "\n> Run: ./.builds/tao-cli {{ args }}\n"
    ./.builds/tao-cli {{ args }}
    echo

# Build everything
[no-quiet]
build:
    cd packages/compiler && just build
    cd packages/ide-extension && just build
    cd packages/tao-cli && just build
    just _agent-gen-mise-tasks

# Run full battery of checks and builds. Meant to be run before committing.
pre-commit:
    echo "\n> Running pre-commit checks...\n"
    echo "> Stashing non-staged changes..."
    git stash push --keep-index --include-untracked
    echo "> Running code checks..."
    just check
    echo "> Building everything..."
    just test
    echo "> Checking builds..."
    just check-run-builds
    echo "> Pre-commit checks complete. Unstashing changes..."
    git stash pop

# Format all files
fmt:
    just _fmt

# Check all code: lint, typecheck, etc.
check:
    just _check

# Setup development environment
setup:
    echo "\tSetup Tao Lang dev environment:"
    just _install_mise
    just _do_setup

reload-extension:
    cd packages/ide-extension && just run

install-mise-deps:
    mise install

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

############
# Internal #
############

[private]
_MISE_CMD := "~/.local/bin/mise"

# Formatting and linting
########################

_fmt:
    just --fmt --unstable 1> /dev/null 2>&1
    cd packages/shared-tools && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt 1> /dev/null 2>&1
    {{ _MISE_CMD }} fmt 1> /dev/null 2>&1
    oxlint --fix 1> /dev/null 2>&1

[no-quiet]
_check:
    oxlint
    dprint check
    cd packages/compiler && tsc --noEmit --noUnusedLocals
    cd packages/tao-cli && tsc --noEmit --noUnusedLocals
    cd packages/shared-tools && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint

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
    #!/bin/zsh
    set -e
    eval "$({{ _MISE_CMD }} activate zsh)"
    just _configure_mise
    just _configure_zsh
    just _install_deps
    just _install_ide_extensions
    just _print_setup_done

_install_mise:
    @ echo "\tInstall mise..."
    @ curl -sS https://mise.run | MISE_VERSION=v2025.12.1 sh 2> /dev/null
    @ {{ _MISE_CMD }} trust --quiet

_configure_mise:
    @ echo "\tConfigure mise..."
    @ mise trust --quiet
    @ mise install 2> /dev/null
    @ mise doctor 1> /dev/null

_configure_zsh:
    #!/bin/zsh
    set -e
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

# Agent Generated Commands
##########################
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
    gen-mise-tasks {{ args }}

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
