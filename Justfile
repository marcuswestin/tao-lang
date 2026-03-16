import "./packages/shared/just/all-imports.just"

# Dev Environment Setup
#######################

# Print available commands
help: _print_help

# Create "enter-tao" dev environment
create-dev-env: _create-dev-env

# Update the dev environment
update-dev-env: _update-dev-env

# Setup repo for development
setup: _setup_git_repo

# Development
#############

# Run all components in watch mode
dev: _dev

# Run full battery of checks and builds to prepare for commit.
prep-commit: _prep-commit

# Stash unstaged changes. First make sure that all intended changes are staged.
stash-unstaged-changes: _stash-unstaged-changes

# Restore stashed changes (e.g. after aborting prep-commit workflow).
unstage-changes: _unstage-changes

# Ensures that the repo has no changes.
ensure-repo-clean: _ensure-repo-clean

# Testing
#########

# Run tests for whatever directory we're in
[no-cd]
test *PATTERNS: gen
    bun test --reporter=dot --test-name-pattern "{{ PATTERNS }}"

# Watch tests, but bail on first failure
bail-watch-tests *PATTERNS:
    bun test --watch --bail --test-name-pattern "{{ PATTERNS }}"

# Run all tests, including slow ones
test-all *PATTERNS:
    bun test --reporter=dot {{ PATTERNS }}
    cd packages/expo-runtime && just test {{ PATTERNS }}

# Watch all tests
watch-tests *PATTERNS:
    # If run in any package without watch-tests already defined, watch all tests
    just _watch-all-tests {{ PATTERNS }}

# Formatting, Linting, etc.
###########################

# Format all files
fmt: _fmt

# Run all autofixers: fmt, lint, typecheck, etc.
fix: _fix

# Check all code: lint, typecheck, etc.
check: _check

# Lint all code
lint: _lint

# List all lint rules
lint-rules: _line_rules

# Build commands
################

# Build everything
[no-quiet]
build: gen
    just _build-all

# Generate parser from grammar
gen:
    cd packages/parser && just build

# Build and install the extension to cursor and vscode
extension-build-package-and-install:
    cd packages/ide-extension && just build-package-and-install

clean:
    rm -rf .builds

# Package command runners
# #######################

compiler *ARGS:
    cd {{ justfile_dir() }}/packages/compiler && just {{ ARGS }}

expo-runtime *ARGS:
    cd {{ justfile_dir() }}/packages/expo-runtime && just {{ ARGS }}

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
