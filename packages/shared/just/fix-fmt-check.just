import "./_shared-vars.just"

# Formatting and linting
########################

OXLINT_CMD := "oxlint --ignore-path .gitignore --type-aware --deny-warnings"

_fmt:
    just _fmt_just
    cd packages/shared && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt --incremental=false 1> /dev/null 2>&1
    {{ MISE_CMD }} fmt 1> /dev/null 2>&1
    {{ OXLINT_CMD }} --fix 1> /dev/null 2>&1
    just tao fmt ./Apps/
    just _fmt_newlines

_fmt_just:
    for f in $(git ls-files 'Justfile' '*.just' '*.Justfile'); do \
        just --fmt --unstable --justfile "$f"; \
    done

FMT_NEWLINE_FILTER := "--cached --others --exclude-standard"
FMT_NEWLINE_FILES := "'*.ts' '*.just' '*.Justfile' '*.tsx' '*.js' \
    '*.jsx' '*.json' '*.md' '*.yaml' '*.yml' '*.css' '*.html' '*.sh' \
    '*.zsh' '*.toml' '*.txt' 'Justfile' '*.langium' '*.tao'"
FMT_NEWLINE_SKIP_MISSING := "[[ ! -f $f ]]"
FMT_NEWLINE_SKIP_LINKS := "[[ -L $f ]]"
FMT_NEWLINE_PERL := 'perl -0777 -i -pe "s/\n*\z/\n/" -- "$f"'

_fmt_newlines:
    #!{{ ZSH_INIT }}
    git ls-files -z {{ FMT_NEWLINE_FILTER }} -- {{ FMT_NEWLINE_FILES }} |
    while IFS= read -r -d '' f; do
        {{ FMT_NEWLINE_SKIP_MISSING }} || {{ FMT_NEWLINE_SKIP_LINKS }} || {{ FMT_NEWLINE_PERL }}
    done

# Run ts-autofix for a package and filters output
[private]
_ts_autofix_package PACKAGE:
    (cd "packages/{{ PACKAGE }}" && ts-autofix fix --tsCliArgs --noUnusedLocals 2>&1 | grep -v 'Processing code fixes for')

[no-quiet]
_fix: _fmt
    just concurrently-exec-named \
        "compiler" "just _ts_autofix_package compiler" \
        "tao-cli" "just _ts_autofix_package tao-cli" \
        "shared" "just _ts_autofix_package shared" \
        "headless-runtime" "just _ts_autofix_package headless-test-runtime" \
        "ide-extension" "just _ts_autofix_package ide-extension" \
        "expo-runtime" "just _ts_autofix_package expo-runtime"
    cd packages/expo-runtime && bunx expo lint --fix
    cd packages/expo-runtime && bunx eslint --fix
    just _fmt # Run formatter again, for any changes made

[no-quiet]
_check:
    just concurrently-exec-named \
        "lint" "just lint" \
        "dprint" "dprint check --incremental=false" \
        "compiler-build" "cd packages/compiler && tsc -b --force"
    just concurrently-exec-named \
        "compiler" "cd packages/compiler && tsc --noEmit --noUnusedLocals" \
        "tao-cli" "cd packages/tao-cli && tsc --noEmit --noUnusedLocals" \
        "shared" "cd packages/shared && tsc --noEmit --noUnusedLocals" \
        "headless-runtime" "cd packages/headless-test-runtime && tsc --noEmit --noUnusedLocals" \
        "ide-extension" "cd packages/ide-extension && tsc --noEmit --noUnusedLocals" \
        "expo-runtime" "cd packages/expo-runtime && tsc --noEmit --noUnusedLocals" \
        "expo-lint" "cd packages/expo-runtime && just lint"

_lint:
    {{ OXLINT_CMD }}

_lint_rules:
    {{ OXLINT_CMD }} --rules
