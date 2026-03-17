import "./packages/shared/just/all-imports.just"

# Settings for the agent justfile
# - `quiet` -> Don't print each command as it's executed.
# - `shell` -> recipe step command: zsh, exit on error, error on unset variable, fail on pipefail
# - `dotenv-load` -> Load environment variables from .env

MAIN_JUSTFILE := "--justfile Justfile"
AGENT_JUSTFILE := "--justfile just-agents.Justfile"

# Command recipes
#################

# Help: List all available agent commands with descriptions
help:
    echo
    echo 'To run shell commands, use: \n\n    `./just-agents shell <cmd> <args>`'.
    echo
    echo 'Available shell commands:'
    echo '    {{ ALLOWED_SHELL_COMMANDS }}' | sed "s/\|/ /g"
    echo
    just {{ AGENT_JUSTFILE }} --list --unsorted

# Formats all files
fmt:
    just {{ MAIN_JUSTFILE }} fmt

# Runs all autofixers: lint, typecheck, etc.
fix:
    just {{ MAIN_JUSTFILE }} fix

# Run full battery of checks and builds to prepare for commit.
prep-commit:
    echo 'Running ./just-agents prep-commit...\n'
    just {{ MAIN_JUSTFILE }} prep-commit
    echo '\nPrep-commit complete!\n'

# Checks: Run tests - optionally specify which `TEST_NAMES_PATTERN` to filter test with (e.g. `test "formatter"`, test `"validation|parser"`)
test *TEST_NAMES_PATTERN:
    just {{ MAIN_JUSTFILE }} test "{{ TEST_NAMES_PATTERN }}"

# Test all packages, including slow ones
test-all:
    just {{ MAIN_JUSTFILE }} test-all

# Checks: Lint all code
lint:
    just {{ MAIN_JUSTFILE }} lint

# Check all code: lint, typecheck, etc.
check:
    just {{ MAIN_JUSTFILE }} check

# Generate parser from grammar
gen:
    just {{ MAIN_JUSTFILE }} gen

# Builds: Build all packages
build:
    just {{ MAIN_JUSTFILE }} build

# Cleans: Clean all build artifacts in .builds/
clean:
    just {{ MAIN_JUSTFILE }} clean

# Package commands: Run commands in packages/expo-runtime
expo-runtime *ARGS:
    just {{ MAIN_JUSTFILE }} expo-runtime {{ ARGS }}

# Pass-through commands
#======================

ALLOWED_GIT_COMMANDS := "log|status|diff|add|commit"
ALLOWED_SHELL_COMMANDS := "grep|ls|echo|head|find|true|test|tail|tsc|mkdir|cat|cp|mv|touch|git"

# Execute a shell command, e.g `./just-agents shell ls`
[positional-arguments]
shell EXEC_CMD *ARGS:
    #!{{ ZSH_INIT }}
    if [ "$1" = "git" ]; then
        just {{ AGENT_JUSTFILE }} _check-allowed-git-subcommand "$2"
        if [ "$2" = "commit" ]; then just {{ AGENT_JUSTFILE }} prep-commit; fi
    fi
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "{{ ALLOWED_SHELL_COMMANDS }}" env "shell" "$1" "${@:2}"

_check-allowed-git-subcommand SUB_CMD:
    #!{{ ZSH_INIT }}
    if ! echo "{{ ALLOWED_GIT_COMMANDS }}" | grep -qw "{{ SUB_CMD }}"; then
        echo "git {{ SUB_CMD }} not allowed." >&2
        echo "Allowed git subcommands: {{ ALLOWED_GIT_COMMANDS }}" >&2
        exit 1
    fi

[positional-arguments]
_execute_whitelisted_subcommand SUB_CMD_WHITELIST EXEC RECIPE_NAME SUB_CMD *ARGS:
    #!{{ ZSH_INIT }}
    # $1=whitelist, $2=exec (git or env), $3=recipe name (for errors), $4=subcommand, "${@:5}"=args
    if ! echo "|$1|" | grep -q "|$4|"; then
        echo "{{ RECIPE_NAME }} <command> not allowed: $4." >&2
        echo "Allowed commands: $1" >&2
        echo "If you need a new command, ask to have it added." >&2
        exit 1
    fi
    # When piping commands, we can get exit code 141 = SIGPIPE, which is expected piped e.g. into `./just-agents shell git log | ./just-agents shell head`
    "$2" "$4" "${@:5}" || { ret=$?; [ $ret -eq 141 ] && exit 0; exit $ret; }
