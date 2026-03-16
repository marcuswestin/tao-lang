import "./_shared-vars.just"

[positional-arguments]
_tao *ARGS:
    pushd packages/tao-cli && just build && popd
    ./.builds/tao-cli "$@"

_stash-unstaged-changes:
    echo "> Stashing non-staged changes..." && git stash --keep-index --include-untracked
    echo "\n> Stashing complete.\n"

_unstage-changes:
    echo "> Aborting pre-commit workflow. Attempting to unstage all changes..."
    echo "> Attempting to unstage all changes..." && git stash apply stash@{0}
    echo "> Unstage successful. Dropping stash..." && git stash drop
    echo "> Abort successful."

_prep-commit:
    echo "\n> Clean build artifacts..." && just clean
    echo "> Build everything..." && just build
    echo "> Run pre-commit checks..." && just check
    echo "> Run code tests..." && just test-all
    echo "\n> Pre-commit checks complete. Ready to commit.\n"

_post-commit-unstash:
    echo "> Ensure no changes..." && just _ensure-repo-clean
    echo "> Pre-commit checks complete. Unstashing changes..." && git stash pop

_ensure-repo-clean:
    if output=$(git status --porcelain) && [ -n "$output" ]; then exit 1; fi

_build-all:
    just _install-mise-deps
    cd packages/shared && just build
    cd packages/parser && just build
    cd packages/compiler && just build
    cd packages/tao-cli && just build
    cd packages/expo-runtime && just build
    cd packages/ide-extension && just build-package-and-install

x-fix-file-associations:
    brew install duti --quiet
    for ext in md txt json yaml yml xml css js ts tsx jsx zsh just; \
        do duti -s $(osascript -e 'id of app "Cursor"') .$ext all; \
    done
