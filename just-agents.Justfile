# Settings for the agent justfile
# - `quiet` -> Don't print each command as it's executed.
# - `shell` -> recipe step command: zsh, exit on error, error on unset variable, fail on pipefail
# - `dotenv-load` -> Load environment variables from .env

set shell := ["zsh", "-e", "-u", "-o", "pipefail", "-c"]
set dotenv-load := true

# Command recipes
#################

# Help: List all available agent commands with descriptions
help:
    echo
    just {{ AGENT_JUSTFILE }} --list --unsorted
    echo

# Help: List all available agent commands as a single list
list-commands:
    just {{ AGENT_JUSTFILE }} --summary --unsorted

# Exec git: Execute whitelisted git command, e.g `./just-agents git add ./Docs`. Whitelist: `log`, `status`, `diff`, `add`, `commit`. For commits with a message use `git-commit "message"`.
git SUB_CMD *ARGS:
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "|log|status|diff|add|commit|" git {{ SUB_CMD }} {{ ARGS }}

# Exec shell: Execute whitelisted shell command, e.g `./just-agent shell ls`. Whitelist: `cd`, `ls`, `pwd`, `echo`, `cat`
shell EXEC_CMD *ARGS:
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "|cd|ls|pwd|echo|cat|" "" {{ EXEC_CMD }} {{ ARGS }}

# Fixes: Format all files
fmt:
    just {{ MAIN_JUSTFILE }} fmt

# Fixes: Run all autofixers: lint, typecheck, etc. Useful to run before 'check'
fix:
    just {{ MAIN_JUSTFILE }} fix

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

# Commits
#========

# Run full battery of checks and builds to prepare for commit.
prep-commit:
    just {{ MAIN_JUSTFILE }} prep-commit

# Unstash all changes, even if there are uncommitted changes.
abort-pre-commit:
    just {{ MAIN_JUSTFILE }} unstage-changes

# Unstash changes after commit. Only works if repo is completely clean.
post-commit-unstash:
    just {{ MAIN_JUSTFILE }} post-commit-unstash

# Private helpers
#================

_execute_whitelisted_subcommand SUB_CMD_WHITELIST EXEC SUB_CMD *ARGS:
    #!/usr/bin/env zsh
    if ! echo "{{ SUB_CMD_WHITELIST }}" | grep -q "|{{ SUB_CMD }}|"; then
        echo "invalid subcommand: {{ SUB_CMD }}. Allowed: {{ SUB_CMD_WHITELIST }}" >&2
        exit 1
    fi
    {{ EXEC }} {{ SUB_CMD }} {{ ARGS }}

# Variables
#==========

MAIN_JUSTFILE := "--justfile Justfile"
AGENT_JUSTFILE := "--justfile just-agents.Justfile"
