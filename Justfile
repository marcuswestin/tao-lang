setup:
    @ echo "\tInstalling mise..."
    @ curl https://mise.run | sh > /dev/null 2>&1
    @ ~/.local/bin/mise doctor > /dev/null 2>&1
    @ echo "\n# Added by tao-lang dev env 'just setup'"  >> ~/.zshrc
    @ echo "eval \"\$(~/.local/bin/mise activate zsh)\"" >> ~/.zshrc
    @ echo 'plugins=(... mise)' >> ~/.zshrc
    @ echo "alias et='cd $PWD'" >> ~/.zshrc
    @ ~/.local/bin/mise use -g usage
    @ ~/.local/bin/mise trust --quiet ./mise.toml
    @ echo
    @ echo "\tDone!"
    @ echo "\tNow restart your shell and run 'et'"
    @ echo
