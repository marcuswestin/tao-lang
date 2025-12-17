# Formatting and linting
########################


_fmt:
    just _fmt_just
    cd packages/shared-tools && just sort-package-json-files 1> /dev/null 2>&1
    dprint fmt 1> /dev/null 2>&1
    {{ MISE_CMD }} fmt 1> /dev/null 2>&1
    oxlint --fix 1> /dev/null 2>&1

_fmt_just:
    find . -type f \( -name "Justfile" -o -name "*.just" \) -exec just --fmt --unstable --justfile {} \; 1> /dev/null 2>&1

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
