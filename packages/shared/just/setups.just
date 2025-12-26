import "./_shared-vars.just"

_print_help:
    echo "\nTo ended Tao Dev Env, run either of:\n"
    echo "    enter-tao"
    echo "    et"
    echo "\n For more commands, run:\n"
    echo "    just <recipe>"
    echo
    just --list --unsorted --color=always | grep -v "_"
    echo

_install-mise-deps:
    mise install

_update-deps:
    mise self-update --yes
    mise install

# Setup development environment
_setup-dev-env:
    echo "\tSetup Tao Lang dev environment:"
    git config core.hooksPath shared/git-hooks
    just _install_mise
    # TODO: Make this work again: eval "$({{ MISE_CMD }} activate zsh)"
    just _do_setup

_do_setup:
    #!{{ SHELL_INIT }}
    just _configure_mise
    just _configure_zsh
    just _install_deps
    just _install_ide_extensions
    just _build_all
    just _print_setup_done

_install_mise:
    @ echo "\tInstall mise..."
    @ curl -sS https://mise.run | MISE_VERSION=v2025.12.1 sh 2> /dev/null
    @ just _trust_mise

_configure_mise:
    @ echo "\tConfigure mise..."
    @ mise trust --quiet --yes
    @ mise install 2> /dev/null
    @ mise doctor 1> /dev/null

_configure_zsh:
    #!{{ SHELL_INIT }}
    echo "\tConfigure zsh..."
    add_if_missing() { local line="$1" file="$2"; grep -qxF "$line" "$file" || echo "\n# Added by tao-lang dev env '_configure_zsh' justfile rule\n$line" >> "$file"; }
    add_if_missing "alias et=enter-tao && alias enter-tao='echo \" * Enter Tao Lang dev env * \" && cd $PWD && source .config/enter-tao-dev-env-source-configure.zsh'" ~/.zshrc

_install_deps:
    @ echo "\tInstall dependencies..."
    @ curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    @ mise install 2> /dev/null

_install_ide_extensions:
    @ echo "\tInstall IDE extensions..."
    @ jq -r '.recommendations[]' .vscode/extensions.json | xargs -L 1 cursor --force --install-extension 1> /dev/null

_build_all:
    @ echo "\tBuild all packages..."
    just build-all

_print_setup_done:
    @ echo "\n\t*** Done ***"
    @ echo "\trestart your terminal and run:\n"
    @ echo "\t\tenter-tao && just help"
    @ echo
