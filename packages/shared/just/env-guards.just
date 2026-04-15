# `_skip_if_env_eq VAR val` exits 0 on match (use before `||`), 1 otherwise — never use `&&` here.
# `_skip_if_env_ne VAR val` exits 0 when env differs from val (use before `||`), 1 otherwise.

[no-exit-message]
_skip_if_env_eq NAME VALUE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ ! "{{ NAME }}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
        echo "error: _skip_if_env_eq: invalid env name: {{ NAME }}" >&2
        exit 2
    fi
    name="{{ NAME }}"
    value="{{ VALUE }}"
    v="${!name:-}"
    [[ "$v" == "$value" ]] && exit 0
    exit 1

[no-exit-message]
_skip_if_env_ne NAME VALUE:
    #!/usr/bin/env bash
    set -euo pipefail
    v="${!{{ NAME }}:-}"
    [[ "$v" != "${{ VALUE }}" ]] && exit 0
    exit 1
