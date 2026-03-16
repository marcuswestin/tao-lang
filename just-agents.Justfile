# Settings for the agent justfile
# - `quiet` -> Don't print each command as it's executed.
# - `shell` -> recipe step command: zsh, exit on error, error on unset variable, fail on pipefail
# - `dotenv-load` -> Load environment variables from .env

set shell := ["zsh", "-e", "-u", "-o", "pipefail", "-c"]
set dotenv-load := true

MAIN_JUSTFILE := "--justfile Justfile"
AGENT_JUSTFILE := "--justfile just-agents.Justfile"

# Command recipes
#################

# Help: List all available agent commands with descriptions
help:
    echo
    just {{ AGENT_JUSTFILE }} --list --unsorted
    echo "Allowed for ./just-agents shell <commands>: {{ ALLOWED_SHELL_COMMANDS }}"
    echo "Allowed for ./just-agents git <commands>: {{ ALLOWED_GIT_COMMANDS }}"
    echo

# Formats all files
fmt:
    just {{ MAIN_JUSTFILE }} fmt

# Runs all autofixers: lint, typecheck, etc.
fix:
    just {{ MAIN_JUSTFILE }} fix

# Run full battery of checks and builds to prepare for commit.
prep-commit:
    just {{ MAIN_JUSTFILE }} prep-commit

# Checks: Run tests - optionally specify which `TEST_PATTERNS` to filter test with (e.g. `test "formatter"`, test `"validation|parser"`)
test *TEST_PATTERNS:
    just {{ MAIN_JUSTFILE }} test {{ TEST_PATTERNS }}

# Checks: Lint all code
lint:
    just {{ MAIN_JUSTFILE }} lint

# Generate parser from grammar
gen:
    just {{ MAIN_JUSTFILE }} gen

# Builds: Build all packages
build:
    just {{ MAIN_JUSTFILE }} build

# Pass-through commands
#========

# Shell commands

ALLOWED_GIT_COMMANDS := "|log|status|diff|add|commit|"
ALLOWED_SHELL_COMMANDS := "|grep|ls|echo|head|find|true|test|tail|tsc|mkdir|cat|cp|mv|touch|"

# List this last, so that agent sees it right after the `just shell` mention in `./just-agents help`
# Exec a shell command, e.g `./just-agents shell ls`. To see allowed commands, run `./just-agents help`
[positional-arguments]
@ shell EXEC_CMD *ARGS:
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "{{ ALLOWED_SHELL_COMMANDS }}" env "shell" "$1" "${@:2}"

# Exec git: Execute whitelisted git command, e.g `./just-agents git add ./Docs`, `./just-agents git commit -m "message"`. Whitelist: `log`, `status`, `diff`, `add`, `commit`.
[positional-arguments]
@ git SUB_CMD *ARGS:
    if [ "$1" = "commit" ]; then just {{ AGENT_JUSTFILE }} prep-commit; fi
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "{{ ALLOWED_GIT_COMMANDS }}" git "git" "$1" "${@:2}"

[positional-arguments]
_execute_whitelisted_subcommand SUB_CMD_WHITELIST EXEC RECIPE_NAME SUB_CMD *ARGS:
    #!/usr/bin/env zsh
    # $1=whitelist, $2=exec (git or env), $3=recipe name (for errors), $4=subcommand, "${@:5}"=args
    if ! echo "$1" | grep -q "|$4|"; then
        echo "{{ RECIPE_NAME }} <command> not allowed: $4." >&2
        echo "Allowed commands: $1" >&2
        echo "If you need a new command, ask to have it added." >&2
        exit 1
    fi
    "$2" "$4" "${@:5}"
