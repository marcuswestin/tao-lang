import "./_shared-vars.just"

CONCURRENTLY_COLORS := '--prefix-colors "#4FC3F7,#81C784,#FFD54F,#FF8A65,#BA68C8,#4DD0E1,#F06292,#AED581,#7986CB,#FFB74D"'
CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS := "--success first"
CONCURRENTLY_EXIT_ALL_TOGETHER := "--kill-others --kill-others-on-fail"
CONCURRENTLY_CMD := "./packages/shared-tools/node_modules/.bin/concurrently"
CONCURRENTLY_RUN_AND_STOP_ALL_CMD := f"\
    {{CONCURRENTLY_CMD}} \
    {{CONCURRENTLY_COLORS}} \
    {{CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS}} \
    {{CONCURRENTLY_EXIT_ALL_TOGETHER}} \
    "

say-hello:
    echo "hello"

# Run recipes in parallel. All die when any exits. Output prefixed with recipe name.
parallel *RECIPES:
    just prefix-strip-parallel "" {{ RECIPES }}

# Run recipes in parallel with prefix stripping from labels.
prefix-strip-parallel PREFIX *RECIPES:
    just _prefix-strip-parallel {{ PREFIX }} {{ RECIPES }}

# Usage: just concurrently "<cmd1> <args>" "<2cmd> <args>"
[positional-arguments]
concurrently *CMDS:
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} "$@"

# Usage: just concurrently-named "<name 1>" "<cmd 1>" "<name 2>" "<cmd 2>" ...
[positional-arguments]
concurrently-named *NAMES_AND_CMDS:
    #!{{ SHELL_INIT }}
    names=() && cmds=()
    while (( {{ NUM_ARGS }} >= 2 )); do
        names+=("$1") && cmds+=("$2")
        shift 2
    done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

NUM_ARGS := "$#"

_prefix-strip-parallel PREFIX *RECIPES:
    #!{{ SHELL_INIT }}
    p="{{ PREFIX }}"; recipes=({{ RECIPES }})
    for r in "${recipes[@]}"; do cmds+=("just $r"); names+=("${r#$p}"); done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"
