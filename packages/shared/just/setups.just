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
    curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    # TODO: Make this work again: eval "$({{ MISE_CMD }} activate zsh)"
    just _configure_zsh
    just _install_ide_extensions
    just _setup_git_repo
    just _print_setup_done

_setup_git_repo:
    #!{{ SHELL_INIT }}
    mise trust --quiet --yes
    mise install 2> /dev/null
    mise doctor 1> /dev/null
    just build-all

_install_mise:
    @ echo "\tInstall mise..."
    @ curl -sS https://mise.run | MISE_VERSION=v2025.12.1 sh 2> /dev/null
    @ just _trust_mise

_configure_zsh:
    #!{{ SHELL_INIT }}
    echo "\tConfigure zsh..."
    add_if_missing() { local line="$1" file="$2"; grep -qxF "$line" "$file" || echo "\n# Added by tao-lang dev env '_configure_zsh' justfile rule\n$line" >> "$file"; }
    add_if_missing "alias et=enter-tao && alias enter-tao='echo \" * Enter Tao Lang dev env * \" && cd $PWD && source .config/enter-tao-dev-env-source-configure.zsh'" ~/.zshrc

_install_ide_extensions:
    @ echo "\tInstall IDE extensions..."
    @ jq -r '.recommendations[]' .vscode/extensions.json | xargs -L 1 cursor --force --install-extension 1> /dev/null

_print_setup_done:
    @ echo "\n\t*** Done ***"
    @ echo "\trestart your terminal and run:\n"
    @ echo "\t\tenter-tao && just help"
    @ echo
