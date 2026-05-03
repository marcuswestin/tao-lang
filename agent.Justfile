import "./packages/shared/just/_shared-vars.just"

MAIN_JUSTFILE := "--justfile Justfile"
AGENT_JUSTFILE := "--justfile agent.Justfile"

# `./agent` is the effective whitelist of commands agents may run in this repo.

READ_COMMANDS := "ls|cat|head|tail|wc|tree|less|bat|grep|rg|find|fd|sort|uniq|cut|tr|diff|jq|yq|echo|printf|pwd|id|date"
DIAGNOSTIC_COMMANDS := "tsc|dprint|oxlint"
WRITE_COMMANDS := "mkdir|touch"
AGENT_COMMANDS := READ_COMMANDS + "|" + DIAGNOSTIC_COMMANDS + "|" + WRITE_COMMANDS
GIT_COMMANDS := "log|status|diff|show|branch|tag|rev-parse|ls-files|blame|shortlog|remote|describe|name-rev|for-each-ref|reflog|cat-file|rev-list|add|commit|stash|restore|merge"

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
    echo 'Git commands: ./agent git <subcommand> <args>'
    echo '{{ GIT_COMMANDS }}' | sed "s/|/ /g" | fold -s -w 76 | sed 's/^/    /'
    echo
    echo 'Branch creation: ./agent git-create-branch <branch-name>'
    echo
    just {{ AGENT_JUSTFILE }} --list --unsorted

# Setup repo (install deps, generate parser, build). Run this first in a new worktree.
setup:
    if [ -x "$HOME/.local/bin/mise" ]; then "$HOME/.local/bin/mise" trust .config/mise.toml; fi
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

# Run an allowed git subcommand.
[positional-arguments]
git SUB_CMD *ARGS:
    #!{{ ZSH_INIT }}
    just {{ AGENT_JUSTFILE }} _check_allowed_git_subcommand "$1"
    if [ "$1" = "commit" ]; then
        needs_prep=0
        if ! git diff --cached --quiet --exit-code; then
            needs_prep=1
        else
            for arg in "${@:2}"; do
                if [[ "$arg" = "--all" || ( "$arg" != "--"* && "$arg" = -*a* ) ]]; then
                    if ! git diff --quiet --exit-code; then needs_prep=1; fi
                    break
                fi
            done
        fi

        if [ "$needs_prep" = "1" ]; then
            just {{ AGENT_JUSTFILE }} prep-commit
        else
            echo "> No staged commit content; skipping pre-commit prep."
        fi
    fi
    exec git "$@"

[positional-arguments]
_run-command EXEC_CMD *ARGS:
    #!{{ ZSH_INIT }}
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_command "$1" "${@:2}"

_check_allowed_git_subcommand SUB_CMD:
    #!{{ ZSH_INIT }}
    if ! echo "|{{ GIT_COMMANDS }}|" | grep -Fq "|{{ SUB_CMD }}|"; then
        echo "git {{ SUB_CMD }} not allowed." >&2
        echo "Run ./agent help for allowed git subcommands (./agent git <sub>)." >&2
        exit 1
    fi

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
