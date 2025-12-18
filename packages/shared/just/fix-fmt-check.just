import "./_shared-vars.just"
import "./setups.just"

# Formatting and linting
########################

_fmt:
    just _fmt_just
    cd packages/shared-tools && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt 1> /dev/null 2>&1
    {{ MISE_CMD }} fmt 1> /dev/null 2>&1
    oxlint --fix 1> /dev/null 2>&1
    just _fmt_newlines

_fmt_just:
    for f in $(git ls-files 'Justfile' '*.just'); do \
        just --fmt --unstable --justfile "$f"; \
    done

_fmt_newlines:
    git ls-files '*.ts' '*.just' '*.tsx' '*.js' '*.jsx' '*.json' '*.md' '*.yaml' '*.yml' '*.css' '*.html' '*.sh' '*.zsh' '*.toml' '*.txt' 'Justfile' '*.just' '*.langium' '*.tao' | while read f; do [ -s "$f" ] && [ -n "$(tail -c1 "$f")" ] && echo >> "$f"; done; true

[no-quiet]
_fix:
    cd packages/compiler && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/tao-cli && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/shared-tools && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && bunx ts-autofix fix --tsCliArgs --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint --fix
    cd packages/expo-runtime && bunx eslint --fix

[no-quiet]
_check:
    oxlint
    dprint check
    cd packages/compiler && tsc --noEmit --noUnusedLocals
    cd packages/tao-cli && tsc --noEmit --noUnusedLocals
    cd packages/shared-tools && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && tsc --noEmit --noUnusedLocals
    cd packages/expo-runtime && bunx expo lint
    cd packages/expo-runtime && bunx eslint
