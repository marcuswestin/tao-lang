import "./_shared-vars.just"

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
    just deps
    just concurrently-exec-named \
        "shared" "just shared build" \
        "parser" "just parser build"
    just concurrently-exec-named \
        "formatter" "just formatter build" \
        "compiler" "just compiler build"
    just cli build
    just concurrently-exec-named \
        "headless-runtime" "just headless-test-runtime build" \
        "expo-runtime" "just expo-runtime build" \
        "ide-extension" "TAO_SKIP_COMPILER_BUILD=1 just ide-extension build"
