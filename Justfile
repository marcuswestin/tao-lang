import "./packages/shared/just/all-imports.just"

# set quiet := true
# Dev commands
##############

# Print available commands
help:
    just _print_help

# Setup dev env
setup-dev-env:
    just _setup-dev-env

# Build and run all components
dev:
    just _dev

# Build and run Tao CLI with given arguments
tao *ARGS:
    just _tao {{ ARGS }}

# Run tests for whatever directory we're in
[no-cd]
test *PATTERNS:
    just test-fast "{{ PATTERNS }}"

# Run all tests
test-fast *PATTERNS:
    bun test --reporter=dot --test-name-pattern "{{ PATTERNS }}"

test-bail *PATTERNS:
    bun test --watch --bail --test-name-pattern "{{ PATTERNS }}"

# Run all tests
test-all *PATTERNS:
    bun test --reporter=dot {{ PATTERNS }}
    cd packages/expo-runtime && just test {{ PATTERNS }}

test-formatter *PATTERNS:
    bun test --watch --reporter=dot --test-name-pattern "{{ PATTERNS }}" packages/compiler/formatter-tests

# Watch all tests
watch-tests *PATTERNS:
    # If run in any package without watch-tests already defined, watch all tests
    just _watch-all-tests {{ PATTERNS }}

# Build everything
[no-quiet]
build:
    just build-all

# Alias
build-all:
    just _build-all

# Build and install the extension to cursor
extension-build-package-and-install:
    cd packages/ide-extension && just build && just package-and-install

# Run full battery of checks and builds. Meant to be run before committing.
pre-commit:
    just _pre-commit

full-test:
    echo "> Running code checks..." && just check
    echo "> Building everything..." && just test

# Format all files
fmt:
    just _fmt

# Run all autofixers: lint, typecheck, etc.
fix:
    just _fix

# Check all code: lint, typecheck, etc.
check: build
    just _check

# Run mise MCP server
mcp-run:
    screen -dmS mise-mcp mise mcp

# Halt mise MCP server
mcp-halt:
    screen -X -S mise-mcp quit

# Sub-project commands
# #####################

compiler *ARGS:
    cd packages/compiler && just {{ ARGS }}

expo-runtime *ARGS:
    cd packages/expo-runtime && just {{ ARGS }}

ide-extension *ARGS:
    cd packages/ide-extension && just {{ ARGS }}

shared *ARGS:
    cd packages/shared && just {{ ARGS }}

tao-cli *ARGS:
    cd packages/tao-cli && just {{ ARGS }}

[no-cd]
q-dev *ARGS:
    bun {{ justfile_dir() }}/packages/shared/scripts/q-dev.ts {{ ARGS }}

[no-cd]
bun *ARGS:
    bun {{ ARGS }}

# Additional commands
#####################

install-mise-deps:
    just _install-mise-deps

update-deps:
    just _update-deps
