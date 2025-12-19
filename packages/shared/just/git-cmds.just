import "./_shared-vars.just"

STAGING_AREA_DIR := "../../.builds/staging-area"

git-stage-and-test NAME:
    #!{{ SHELL_INIT }}
    dir="${{ STAGING_AREA_DIR }}/{{ NAME }}"
    echo "Staging test in ${dir}"
    if [ -d "${dir}" ]; then
        echo "Staging area ${dir} already exists"
        exit 1
    fi
    mkdir -p "$dir"
    git checkout-index -a -f --prefix="$dir/"
    echo "Stage created at ${dir}"
    cd "$dir"
    just _trust_mise
    just build
    just test
    just check
