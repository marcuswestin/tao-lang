set shell := ["zsh", "-eu", "-o", "pipefail", "-c"]
set positional-arguments := true
set dotenv-load := true
set quiet := true

# SHELL_INIT Usage: #!{{ SHELL_INIT }}
# This initializes a recipe shell with -eu -o pipefail

SHELL_INIT := "/bin/zsh -eu -o pipefail"

[script]
foo:
    export FOO=bar
    echo $FOO
