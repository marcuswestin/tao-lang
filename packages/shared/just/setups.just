import "./_shared-vars.just"

_print_help:
    echo "\nTo enter the Tao dev environment, run:\n"
    echo "    bash .config/bootstrap-dev-env.sh"
    echo "\nFor more commands, run:\n"
    echo "    just <recipe>"
    echo
    just --list --unsorted --color=always
    just _print_devenv_scripts
    echo

_print_devenv_scripts:
    #!{{ ZSH_INIT }}
    if [ -n "${TAO_DEVENV_SCRIPT_HELP:-}" ]; then
        echo "\nAvailable devenv scripts:\n"
        printf '%s\n' "$TAO_DEVENV_SCRIPT_HELP" | awk -F= '
            NF {
                description = substr($0, index($0, "=") + 1)
                printf "    %-16s %s\n", $1, description
            }
        '
    fi

_setup_git_repo:
    # Keep these as commands. Package-local Justfiles import this file, but do not define root recipes like `deps`.
    just deps
    just _setup_dprint_plugins
    just gen build

_setup_dprint_plugins:
    dprint config update --yes
