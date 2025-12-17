_tao *ARGS:
    pushd packages/tao-cli && just build && popd
    echo "\n> Run: ./.builds/tao-cli "$@"\n"
    ./.builds/tao-cli "$@"
    echo

_pre-commit:
    echo "\n> Run pre-commit checks...\n"
    echo "> Stashing non-staged changes..." && git stash push --keep-index --include-untracked
    echo "> Running code checks..." && just check
    echo "> Building everything..." && just test
    echo "> Checking builds..." && just check-run-builds
    echo "> Pre-commit checks complete. Unstashing changes..." && git stash pop

_build-all:
    just install-mise-deps
    cd packages/shared-tools && just build
    cd packages/shared && just build
    cd packages/compiler && just build
    cd packages/tao-cli && just build
    cd packages/expo-runtime && just build
    cd packages/ide-extension && just build
    just _agent-gen-mise-tasks

x-fix-file-associations:
    brew install duti --quiet
    for ext in md txt json yaml yml xml css js ts tsx jsx zsh just; \
        do duti -s $(osascript -e 'id of app "Cursor"') .$ext all; \
    done
