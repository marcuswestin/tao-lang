import "./packages/shared/just/all-imports.just"

alias b := build
alias c := check
alias f := fmt
alias l := lint
alias d := dev
alias t := test
alias w := watch

# Dev Environment Setup
#######################

# Print available commands
help: _print_help

# Create "enter-tao" dev environment
create-dev-env: _create_dev_env

# Update the dev environment
update-dev-env: _update_dev_env

# Setup repo for development
setup: _setup_git_repo

# Development
#############

# Run all components in watch mode
dev: build _dev

# Run full battery of checks and builds to prepare for commit.
prep-commit: _prep_commit

# Stash unstaged changes. First make sure that all intended changes are staged.
stash-unstaged-changes: _stash_unstaged_changes

# Restore stashed changes (e.g. after aborting prep-commit workflow).
unstage-changes: _unstage_changes

# Ensures that the repo has no changes.
ensure-repo-clean: _ensure_repo_clean

# Testing
#########

# Run tests for whatever directory we're in, with an optional filter
[no-cd]
test *FILTER: gen
    bun test --reporter=dot --test-name-pattern '{{ FILTER }}'
    just headless-test-runtime test '{{ FILTER }}'

theadless *FILTER: gen
    just headless-test-runtime test '{{ FILTER }}'

# Watch tests, but bail on first failure
bail-watch *FILTER:
    bun test --watch --no-clear-screen --bail --test-name-pattern '{{ FILTER }}'

# Run all tests, including slow ones
test-all *FILTER:
    just test '{{ FILTER }}'
    cd packages/expo-runtime && just test '{{ FILTER }}'

# Watch all tests
watch *FILTER:
    # If run in any package without watch already defined, watch all tests
    just _watch_all_tests '{{ FILTER }}'

# Formatting, Linting, etc.
###########################

# Install all dependencies
deps:
    #!{{ ZSH_INIT }}
    # Loop through packages and install dependencies
    for package in $(ls packages); do
        # If package.json exists, install dependencies
        if [ -f packages/$package/package.json ]; then
            echo "Installing dependencies for $package..."
            pushd packages/$package && bun install && popd
        fi
    done

# Format all files
fmt: _fmt

# Run all autofixers: fmt, lint, typecheck, etc.
fix: _fix

# Check all code: lint, typecheck, etc.
check: build _check

# Lint all code
lint: _lint

# List all lint rules
lint-rules: _lint_rules

# Build commands
################

# Build everything
[no-quiet]
build:
    just _build_all

# Alias for build-all
build-all: _build_all

# Generate parser from grammar (skipped when `TAO_SKIP_GEN=1`)
gen:
    just _skip_if_env_eq TAO_SKIP_GEN 1 || (cd packages/parser && just build)

# Build and install the extension to cursor and vscode
extension-build-package-and-install:
    cd packages/ide-extension && just build-package-and-install

# Drop build outputs and local caches. Does not remove node_modules — use `clean-all` for that.
clean:
    rm -rf .builds
    rm -rf packages/expo-runtime/.expo
    find . -type d -name '_gen-*' -prune -exec rm -rf {} +
    find . -type f -name '*.tsbuildinfo' -delete

# Like `clean`, plus all `node_modules` directories.
clean-all: clean
    find . -name node_modules -type d -prune -exec rm -rf {} +

# Package command runners
# #######################

compiler *ARGS:
    cd {{ justfile_dir() }}/packages/compiler && just {{ ARGS }}

formatter *ARGS:
    cd {{ justfile_dir() }}/packages/formatter && just {{ ARGS }}

expo-runtime *ARGS:
    cd {{ justfile_dir() }}/packages/expo-runtime && just {{ ARGS }}

headless-test-runtime *ARGS:
    cd {{ justfile_dir() }}/packages/headless-test-runtime && just {{ ARGS }}

ide-extension *ARGS:
    cd {{ justfile_dir() }}/packages/ide-extension && just {{ ARGS }}

shared *ARGS:
    cd {{ justfile_dir() }}/packages/shared && just {{ ARGS }}

cli *ARGS:
    cd {{ justfile_dir() }}/packages/tao-cli && just {{ ARGS }}

# Build and run Tao CLI with given arguments
[no-cd]
tao *ARGS:
    just _tao {{ ARGS }}

[no-cd]
q-dev *ARGS:
    bun {{ justfile_dir() }}/packages/shared/scripts/q-dev.ts {{ ARGS }}
