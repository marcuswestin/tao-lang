eval "$(~/.local/bin/mise activate zsh)"
plugins=(... mise)

mise doctor > /dev/null

alias j='just'
alias r='just run'
alias t='just test'
alias b='just build'
alias wt='just watch-tests'
