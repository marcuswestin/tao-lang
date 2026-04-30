import "./_shared-vars.just"

_print_help:
    echo "\nTo ended Tao Dev Env, run either of:\n"
    echo "    enter-tao"
    echo "    et"
    echo "\n For more commands, run:\n"
    echo "    just <recipe>"
    echo
    just --list --unsorted --color=always
    echo

_install_mise_deps:
    {{ MISE_CMD }} install

# Setup development environment
_create_dev_env:
    echo "\tSetup Tao Lang dev environment:"
    just _install_mise
    curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    just _setup_git_repo
    just _configure_zsh
    just _install_ide_extensions
    just _print_keybinding_install
    just _print_setup_done

_update_dev_env:
    just _install_mise # Update mise to latest version
    {{ MISE_CMD }} self-update --yes
    just _install_mise_deps
    {{ MISE_CMD }} doctor
    just build

_setup_git_repo:
    {{ MISE_CMD }} trust --quiet --yes
    {{ MISE_CMD }} install
    just deps gen build

MISE_VERSION_DEF := "MISE_VERSION=v2026.3.5"

_install_mise:
    @ echo "\tInstall mise..."
    curl -sS https://mise.run | {{ MISE_VERSION_DEF }} sh 2> /dev/null
    @ just _trust_mise

_trust_mise:
    {{ MISE_CMD }} trust --quiet --yes

_configure_zsh:
    #!{{ ZSH_INIT }}
    echo "\tConfigure zsh..."
    add_if_missing() { local line="$1" file="$2"; grep -qxF "$line" "$file" || echo "\n# Added by tao-lang dev env '_configure_zsh' justfile rule\n$line" >> "$file"; }
    add_if_missing "alias et=enter-tao && alias enter-tao='echo \" * Enter Tao Lang dev env * \" && cd $PWD && source .config/enter-tao-dev-env-source-configure.zsh'" ~/.zshrc

_install_ide_extensions:
    @ echo "\tInstall IDE extensions..."
    @ jq -r '.recommendations[]' .vscode/extensions.json | xargs -L 1 cursor --force --install-extension 1> /dev/null

_print_keybinding_install:
    @ echo "\n\tInstall keybinding for build and reload the extension."
    @ echo "\tAdd this to your ~/.vscode-keybindings.json file:"
    @ echo "\n\t\t"'{ "key": "cmd+shift+b", "command": "multiCommand.buildExtensionThenRestartHost" },\n'
    @ echo "\t" 'Then press enter to continue...'
    @ read -r

_print_setup_done:
    @ echo "\n\t*** Done ***"
    @ echo "\trestart your terminal and run:\n"
    @ echo "\t\tenter-tao && just help"
    @ echo
