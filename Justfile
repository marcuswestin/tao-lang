import "./packages/shared/just/all-imports.just"

alias b := build
alias c := check
alias f := fmt
alias l := lint
alias d := dev
alias t := test
alias w := watch

# Print available commands
help: _print_help

# Setup repo for development
setup: _setup_git_repo

# Development
#############

# DEV_APP := "./Apps/Test Apps/Data Schema/Data Schema.tao"
BUN_TEST_ROOTS := "packages/shared packages/parser packages/formatter packages/compiler packages/tao-cli packages/ide-extension packages/tao-std-lib"

DEV_APP := "./Apps/Test Apps/Kitchen Sink/Kitchen Sink.tao"

# Run all components in watch mode (Expo web + Metro; iOS Simulator then physical iPhone after Metro is up via launcher).
@dev DEVICE="roPhone" APP=DEV_APP:
    just _dev "{{ DEVICE }}" "{{ APP }}"

# Run the Tao Expo runtime on a physical iOS device only (no full `just dev` stack).
iphone DEVICE="roPhone":
    just expo-runtime device "{{ DEVICE }}"

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
    bun test {{ BUN_TEST_ROOTS }} --reporter=dot --test-name-pattern '{{ FILTER }}'
    just headless-test-runtime test '{{ FILTER }}'
    just expo-runtime test '{{ FILTER }}'

theadless *FILTER: gen
    just headless-test-runtime test '{{ FILTER }}'

# Watch tests, but bail on first failure
bail-watch *FILTER:
    bun test {{ BUN_TEST_ROOTS }} --watch --no-clear-screen --bail --test-name-pattern '{{ FILTER }}'

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
            pushd packages/$package && bun install --silent && popd
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

# Generate parser from grammar (skipped when `TAO_SKIP_GEN=1`)
gen:
    just _skip_if_env_eq TAO_SKIP_GEN 1 || just parser gen

# Build and install the extension to cursor and vscode
extension-build-package-and-install:
    just ide-extension build-package-and-install

# Drop build outputs and local caches. Does not stop local InstantDB or remove node_modules.
clean:
    echo "Removing all build artifacts ..."
    rm -rf .builds
    find . -type d -name '_gen*' -prune -exec rm -rf {} +
    find . -type f -name '*.tsbuildinfo' -delete
    echo "Removing all node_modules/.cache directories ..."
    find . -type d -path '*/node_modules/.cache' -prune -exec rm -rf {} +
    @ just expo-runtime clean

# Like `clean`, plus all node_modules and Expo native directories/caches.
clean-full: clean
    echo "Removing all node_modules directories ..."
    find . -name node_modules -type d -prune -exec rm -rf {} +
    @ just expo-runtime clean-full

stop:
    echo "Stopping local InstantDB Docker stack ..."
    just instantdb-local down

# Code navigation helpers
#########################

search PATTERN DIR=".":
    rg --line-number --no-heading --color=never "{{ PATTERN }}" {{ DIR }} || true

# Package command runners (alphabetically by `packages/<name>`)
# ############################################################

# packages/compiler
compiler *ARGS:
    cd {{ justfile_dir() }}/packages/compiler && just {{ ARGS }}

# packages/expo-runtime
expo-runtime *ARGS:
    cd {{ justfile_dir() }}/packages/expo-runtime && just {{ ARGS }}

# packages/formatter
formatter *ARGS:
    cd {{ justfile_dir() }}/packages/formatter && just {{ ARGS }}

# packages/headless-test-runtime
headless-test-runtime *ARGS:
    cd {{ justfile_dir() }}/packages/headless-test-runtime && just {{ ARGS }}

# packages/ide-extension
ide-extension *ARGS:
    cd {{ justfile_dir() }}/packages/ide-extension && just {{ ARGS }}

# packages/local-instantdb
instantdb-local *ARGS:
    cd {{ justfile_dir() }}/packages/local-instantdb && APP_ID="{{ LOCAL_INSTANTDB_APP_ID }}" just {{ ARGS }}

# packages/parser
parser *ARGS:
    cd {{ justfile_dir() }}/packages/parser && just {{ ARGS }}

# packages/shared
shared *ARGS:
    cd {{ justfile_dir() }}/packages/shared && just {{ ARGS }}

# packages/tao-cli
cli *ARGS:
    cd {{ justfile_dir() }}/packages/tao-cli && just {{ ARGS }}

# Helper commands
#################

# Build and run Tao CLI with given arguments
[no-cd]
[positional-arguments]
tao *ARGS:
    just --justfile {{ justfile_dir() }}/Justfile cli build
    {{ justfile_dir() }}/.builds/tao-cli "$@"

[no-cd]
q-dev *ARGS:
    bun {{ justfile_dir() }}/packages/shared/scripts/q-dev.ts {{ ARGS }}
