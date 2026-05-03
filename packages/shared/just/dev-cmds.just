import "./_shared-vars.just"

[no-cd]
[positional-arguments]
_tao *ARGS:
    cd "{{ justfile_dir() }}/packages/tao-cli" && just build
    {{ justfile_dir() }}/.builds/tao-cli "$@"

_stash_unstaged_changes:
    echo "> Stashing non-staged changes..." && git stash --keep-index --include-untracked
    echo "\n> Stashing complete.\n"

_unstage_changes:
    echo "> Aborting pre-commit workflow. Attempting to unstage all changes..."
    echo "> Attempting to unstage all changes..." && git stash apply stash@{0}
    echo "> Unstage successful. Dropping stash..." && git stash drop
    echo "> Abort successful."

_prep_commit:
    #!/usr/bin/env bash
    set -euo pipefail
    if git diff --quiet --exit-code \
        && git diff --cached --quiet --exit-code \
        && [ -z "$(git ls-files --others --exclude-standard)" ]; then
        echo -e "\n> No repo changes; skipping pre-commit prep.\n"
        exit 0
    fi

    # Order: clean+build gives tests a cold generated baseline; `fix` then repairs
    # source before the final read-only validation phase.
    echo "\n> Clean build artifacts..." && just clean
    echo "> Build everything..." && just build
    echo "> Make auto-fixable changes..." && just fix
    echo "> Run code tests and pre-commit checks..." && just concurrently-exec-named \
        "tests" "TAO_SKIP_GEN=1 just test" \
        "checks" "just _check"
    echo "\n> Pre-commit checks complete. Ready to commit.\n"

_post_commit_unstash:
    echo "> Ensure no changes..." && just _ensure_repo_clean
    echo "> Pre-commit checks complete. Unstashing changes..." && git stash pop

_ensure_repo_clean:
    if output=$(git status --porcelain) && [ -n "$output" ]; then exit 1; fi

# One shell so `export TAO_DEPS_BATCHED=1` applies to every nested `just build` (skips per-package `bun install`).
_build_all:
    #!/usr/bin/env bash
    set -euo pipefail
    export TAO_DEPS_BATCHED=1
    just _install_mise_deps
    just concurrently-exec-named \
        "shared" "cd packages/shared && just build" \
        "parser" "cd packages/parser && just build"
    just concurrently-exec-named \
        "formatter" "cd packages/formatter && just build" \
        "compiler" "cd packages/compiler && just build"
    (cd packages/tao-cli && just build)
    just concurrently-exec-named \
        "headless-runtime" "cd packages/headless-test-runtime && just build" \
        "expo-runtime" "cd packages/expo-runtime && just build" \
        "ide-extension" "cd packages/ide-extension && TAO_SKIP_COMPILER_BUILD=1 just build"

_x_fix_file_associations:
    brew install duti --quiet
    for ext in md txt json yaml yml xml css js ts tsx jsx zsh just; \
        do duti -s $(osascript -e 'id of app "Cursor"') .$ext all; \
    done
