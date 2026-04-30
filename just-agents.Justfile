import "./packages/shared/just/_shared-vars.just"

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

# --- Dangerous git (raw `git` passthrough) ---
#
# **NEVER** run `./just-agents git-dangerously …` for **fetch, checkout, pull, merge, push, rebase**, or other **merge/remotes** work unless the user **explicitly** instructed the agent to perform a **merge** (or an equally explicit one-off like “push this branch to origin after merge”).
# **`git-dangerously commit`:** only under **`tao-git-workflow`** fast-batch rules (run `./just-agents prep-commit` once first); otherwise use `./just-agents shell git commit` so prep-commit runs.
# Normal read-only / safe git: `./just-agents shell git log|status|diff|add|commit` only. This recipe bypasses the shell git allowlist.
#
# After merging `main` into the feature branch: run `./just-agents prep-commit` until green before squash, push, or PR steps (see `tao-git-workflow`).
# Typical local squash onto `main` (prep-commit green on feature after main integration, then on squashed index): `./just-agents git-dangerously fetch origin` → `./just-agents git-dangerously checkout main` → `./just-agents git-dangerously pull origin main` → `./just-agents git-dangerously merge --squash <feature-branch>` → resolve if needed → `./just-agents prep-commit` → stage → `./just-agents git-dangerously commit …` or `shell git commit` → `./just-agents git-dangerously push origin main` (adjust names to match the repo).

# git-dangerously forwards all arguments to `git` (subcommand + flags + operands). Requires at least one argument (the git subcommand).
[positional-arguments]
git-dangerously *GIT_ARGS:
    #!{{ ZSH_INIT }}
    if [[ $# -eq 0 ]]; then
        echo 'git-dangerously: pass a git subcommand and args, e.g. `./just-agents git-dangerously fetch origin`.' >&2
        exit 1
    fi
    exec git "$@"

# Pass-through commands
#======================

ALLOWED_GIT_COMMANDS := "log|status|diff|add|commit"
ALLOWED_SHELL_COMMANDS := "grep|ls|echo|head|find|true|test|tail|tsc|mkdir|cat|cp|mv|touch|git"

# Execute a shell command, e.g `./just-agents shell ls`
[positional-arguments]
shell EXEC_CMD *ARGS:
    #!{{ ZSH_INIT }}
    if [ "$1" = "git" ]; then
        just {{ AGENT_JUSTFILE }} _check_allowed_git_subcommand "$2"
        if [ "$2" = "commit" ]; then just {{ AGENT_JUSTFILE }} prep-commit; fi
    fi
    just {{ AGENT_JUSTFILE }} _execute_whitelisted_subcommand "{{ ALLOWED_SHELL_COMMANDS }}" env "shell" "$1" "${@:2}"

_check_allowed_git_subcommand SUB_CMD:
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
