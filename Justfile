set fallback := true
set dotenv-load := true

_default_cmd:
    @ just _list_just_commands

# Dev commands
##############

# Enter development
dev:
    cursor .

# Format all files
fmt:
    @ just _fmt

# Setup development environment
setup:
    @ just _do_setup

############
# Internal #
############

_MISE_BIN := "~/.local/bin/mise"

# Help commands
_list_just_commands:
    @ echo
    @ just --list --unsorted
    @ echo

# Formatting and linting
_fmt:
    just --fmt --unstable

# Setup
_do_setup:
    @ echo "\tInstalling mise..."
    @ curl https://mise.run | sh > /dev/null 2>&1
    @ just _setup_mise
    @ just _setup_zsh
    @ just _install_deps
    @ just _print_setup_done

_install_deps:
    @ echo "\tInstalling dependencies..."
    @ curl https://cursor.com/install -fsS | bash > /dev/null 2>&1
    @ {{ _MISE_BIN }} install > /dev/null 2>&1

_setup_zsh:
    @ echo "\tSetting up zsh..."
    @ echo "\n# Added by tao-lang dev env 'just setup'"  >> ~/.zshrc
    @ echo "eval \"\$( {{ _MISE_BIN }} activate zsh)\"" >> ~/.zshrc
    @ echo 'plugins=(... mise)' >> ~/.zshrc
    @ echo "alias enter-tao='echo \"Enter Tao Lang dev env\" && cd $PWD'" >> ~/.zshrc
    @ echo "alias et='enter-tao'" >> ~/.zshrc
    @ echo "alias j='just'" >> ~/.zshrc

_setup_mise:
    @ echo "\tSetting up mise..."
    @ {{ _MISE_BIN }} doctor > /dev/null 2>&1
    @ {{ _MISE_BIN }} use -g usage > /dev/null 2>&1
    @ {{ _MISE_BIN }} trust --quiet ./mise.toml > /dev/null 2>&1

_print_setup_done:
    @ echo "\n\n\tSetup done. Restart your shell and run:\n"
    @ echo "\t\tet    # or 'enter-tao'"
    @ echo "\t\tj dev # or 'just dev'"
    @ echo
