set fallback := true
set dotenv-load := true

# Dev commands
##############

# Print available commands
help:
    @ echo "\nTo ended Tao Dev Env, run either of:\n"
    @ echo "    enter-tao"
    @ echo "    et"
    @ echo "\n For more commands, run:\n"
    @ echo "    just <recipe>"
    @ just _list_just_commands

# Format all files
fmt:
    @ just _fmt

# Setup development environment
setup:
    @ echo "\tSetup Tao Lang dev environment:"
    @ just _install_mise
    @ just _do_setup

############
# Internal #
############

[private]
_MISE_CMD := "~/.local/bin/mise"

# Help commands
_list_just_commands:
    @ echo
    @ just --list --unsorted
    @ echo

# Formatting and linting
_fmt:
    @ just --fmt --unstable 1> /dev/null
    @ dprint --config ./.config/dprint.jsonc fmt 1> /dev/null
    @ oxlint --config ./.config/oxlintrc.json --fix 1> /dev/null
    @ {{ _MISE_CMD }} fmt 1> /dev/null

# Setup
_do_setup:
    #!/bin/zsh
    set -e
    eval "$({{ _MISE_CMD }} activate zsh)"
    just _configure_mise
    just _configure_zsh
    just _install_deps
    just _install_ide_extensions
    just _print_setup_done

_install_mise:
    @ echo "\tInstall mise..."
    @ curl -sS https://mise.run | MISE_VERSION=v2025.12.1 sh 2> /dev/null
    @ {{ _MISE_CMD }} trust --quiet

_configure_mise:
    @ echo "\tConfigure mise..."
    @ mise trust --quiet
    @ mise install 2> /dev/null
    @ mise doctor 1> /dev/null

_configure_zsh:
    #!/bin/zsh
    set -e
    echo "\tConfigure zsh..."
    add_if_missing() { local line="$1" file="$2"; grep -qxF "$line" "$file" || echo "\n# Added by tao-lang dev env '_configure_zsh' justfile rule\n$line" >> "$file"; }
    add_if_missing "alias et=enter-tao && alias enter-tao='echo \" * Enter Tao Lang dev env * \" && cd $PWD && source .config/enter-tao-dev-env-configure.zsh'" ~/.zshrc

_install_deps:
    @ echo "\tInstall dependencies..."
    @ curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    @ mise install 2> /dev/null

_install_ide_extensions:
    @ echo "\tInstall IDE extensions..."
    @ jq -r '.recommendations[]' .vscode/extensions.json | xargs -L 1 cursor --force --install-extension 1> /dev/null

_print_setup_done:
    @ echo "\n\t*** Done ***"
    @ echo "\trestart your terminal and run:\n"
    @ echo "\t\tenter-tao && just help"
    @ echo
