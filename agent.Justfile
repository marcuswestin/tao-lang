import "./packages/shared/just/_shared-vars.just"

MAIN_JUSTFILE := "--justfile Justfile"
AGENT_JUSTFILE := "--justfile agent.Justfile"

# `./agent` is the effective whitelist of commands agents may run in this repo.

READ_COMMANDS := "ls|cat|head|tail|wc|tree|less|bat|grep|rg|find|fd|sort|uniq|cut|tr|diff|jq|yq|echo|printf|pwd|id|date"
DIAGNOSTIC_COMMANDS := "tsc|dprint|oxlint"
WRITE_COMMANDS := "mkdir|touch"
AGENT_COMMANDS := READ_COMMANDS + "|" + DIAGNOSTIC_COMMANDS + "|" + WRITE_COMMANDS

# Command recipes
#################

# Help: List all available agent commands with descriptions
help:
    echo
    echo 'Agent command allowlist: ./agent <cmd> <args>'
    echo
    echo 'Read commands:'
    echo '{{ READ_COMMANDS }}' | sed "s/|/ /g" | fold -s -w 76 | sed 's/^/    /'
    echo
    echo 'Diagnostic commands:'
    echo '{{ DIAGNOSTIC_COMMANDS }}' | sed "s/|/ /g" | fold -s -w 76 | sed 's/^/    /'
    echo
    echo 'Write commands:'
    echo '{{ WRITE_COMMANDS }}' | sed "s/|/ /g" | sed 's/^/    /'
    echo
    echo 'Git: ./agent git <args> — forwards to git (same as running git with those arguments).'
    echo
    echo 'Branch creation: ./agent git-create-branch <branch-name>'
    echo
    just {{ AGENT_JUSTFILE }} --list --unsorted

# Setup repo (install deps, generate parser, build). Run this first in a new worktree.
setup:
    just {{ MAIN_JUSTFILE }} setup

# Formats all files
fmt:
    just {{ MAIN_JUSTFILE }} fmt

# Runs all autofixers: lint, typecheck, etc.
fix:
    just {{ MAIN_JUSTFILE }} fix

# Run full battery of checks and builds to prepare for commit.
prep-commit:
    just {{ MAIN_JUSTFILE }} prep-commit

# Checks: Run tests. Optionally specify which tests to run by a filter: `test "compile"`, test `"validation"`
test *NAME:
    just {{ MAIN_JUSTFILE }} test '{{ NAME }}'

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

compiler *ARGS:
    just {{ MAIN_JUSTFILE }} compiler {{ ARGS }}

headless-test-runtime *ARGS:
    just {{ MAIN_JUSTFILE }} headless-test-runtime {{ ARGS }}

ide-extension *ARGS:
    just {{ MAIN_JUSTFILE }} ide-extension {{ ARGS }}

shared *ARGS:
    just {{ MAIN_JUSTFILE }} shared {{ ARGS }}

cli *ARGS:
    just {{ MAIN_JUSTFILE }} cli {{ ARGS }}

tao *ARGS:
    just {{ MAIN_JUSTFILE }} tao {{ ARGS }}

# Create and switch to a new branch.
[positional-arguments]
git-create-branch BRANCH_NAME:
    #!{{ ZSH_INIT }}
    exec git checkout -b "$1"

# Run git with the given arguments (forwarding pass-through).
[positional-arguments]
git SUB_CMD *ARGS:
    #!{{ ZSH_INIT }}
    exec git "$@"

[positional-arguments]
_run-command EXEC_CMD *ARGS:
    #!{{ ZSH_INIT }}
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_command "$1" "${@:2}"

[positional-arguments]
_execute_whitelisted_command EXEC_CMD *ARGS:
    #!{{ ZSH_INIT }}
    # $1=command, "${@:2}"=args

    # Block command chaining / subshells / redirection (`$$` only so Just emits `$` before `(` for grep)
    if [[ "$*" == *';'* || "$*" == *'&&'* || "$*" == *'>'* ]] \
        || printf '%s\n' "$*" | grep -Fq '$$(' \
        || [[ "$*" == *$'\\140'* ]]; then
        echo "$1: unsafe shell construct detected." >&2
        exit 1
    fi

    # Enforce whitelist
    if ! echo "|{{ AGENT_COMMANDS }}|" | grep -Fq "|$1|"; then
        echo "agent command not allowed: $1." >&2
        echo "Allowed commands: {{ AGENT_COMMANDS }}" >&2
        echo "If you need a new command, ask to have it added." >&2
        exit 1
    fi

    # Run whitelisted binary directly (no env wrapper)
    "$1" "${@:2}" || {
        ret=$?
        # Allow SIGPIPE (common in piping)
        [ $ret -eq 141 ] && exit 0
        exit $ret
    }
