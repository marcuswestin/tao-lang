# Formatting and linting
########################
# OXLINT_CMD := "oxlint --type-aware"

OXLINT_CMD := "oxlint"

_fmt:
    just _fmt_just
    cd packages/shared && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt 1> /dev/null 2>&1
    {{ MISE_CMD }} fmt 1> /dev/null 2>&1
    {{ OXLINT_CMD }} --fix 1> /dev/null 2>&1
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

[no-quiet]
_fix: _fmt
    cd packages/compiler && ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/tao-cli && ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/shared && ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/ide-extension && ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint --fix
    cd packages/expo-runtime && bunx eslint --fix
    just _fmt # Run formatter again, for any changes made

[no-quiet]
_check:
    just lint
    dprint check
    cd packages/compiler && tsc --noUnusedLocals
    cd packages/tao-cli && tsc --noEmit --noUnusedLocals
    cd packages/shared && tsc --noEmit --noUnusedLocals
    cd packages/ide-extension && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint
    cd packages/expo-runtime && bunx eslint

_lint:
    {{ OXLINT_CMD }}

_line_rules:
    {{ OXLINT_CMD }} --rules
