import "./_shared-vars.just"

[no-cd]
[positional-arguments]
_tao *ARGS:
    cd "../../packages/tao-cli" && just build
    ../../.builds/tao-cli "$@"

_stash_unstaged_changes:
    echo "> Stashing non-staged changes..." && git stash --keep-index --include-untracked
    echo "\n> Stashing complete.\n"

_unstage_changes:
    echo "> Aborting pre-commit workflow. Attempting to unstage all changes..."
    echo "> Attempting to unstage all changes..." && git stash apply stash@{0}
    echo "> Unstage successful. Dropping stash..." && git stash drop
    echo "> Abort successful."

_prep_commit:
    echo "\n> Make auto-fixable changes..." && just fix
    echo "> Clean build artifacts..." && just clean
    echo "> Build everything..." && just build
    echo "> Run code tests..." && just test-all
    echo "> Run pre-commit checks..." && just check
    echo "\n> Pre-commit checks complete. Ready to commit.\n"

_post_commit_unstash:
    echo "> Ensure no changes..." && just _ensure_repo_clean
    echo "> Pre-commit checks complete. Unstashing changes..." && git stash pop

_ensure_repo_clean:
    if output=$(git status --porcelain) && [ -n "$output" ]; then exit 1; fi

_build_all:
    just _install_mise_deps
    cd packages/shared && just build
    cd packages/parser && just build
    cd packages/formatter && just build
    cd packages/compiler && just build
    cd packages/tao-cli && just build
    cd packages/headless-test-runtime && just build
    cd packages/expo-runtime && just build
    cd packages/ide-extension && just build-package-and-install

_x_fix_file_associations:
    brew install duti --quiet
    for ext in md txt json yaml yml xml css js ts tsx jsx zsh just; \
        do duti -s $(osascript -e 'id of app "Cursor"') .$ext all; \
    done
