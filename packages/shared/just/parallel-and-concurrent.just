import "./_shared-vars.just"

CONCURRENTLY_COLORS := '--prefix-colors "#4FC3F7,#81C784,#FFD54F,#FF8A65,#BA68C8,#4DD0E1,#F06292,#AED581,#7986CB,#FFB74D"'
CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS := "--success first"
CONCURRENTLY_EXIT_ALL_TOGETHER := "--kill-others --kill-others-on-fail"
CONCURRENTLY_CMD := "./packages/shared/node_modules/.bin/concurrently"
CONCURRENTLY_RUN_AND_STOP_ALL_CMD := CONCURRENTLY_CMD + " " + CONCURRENTLY_COLORS + " " + CONCURRENTLY_PROPOGATE_FIRST_EXIT_STATUS + " " + CONCURRENTLY_EXIT_ALL_TOGETHER

# Run recipes in parallel. All die when any exits. Usage: `just run-parallel <recipe1> <recipe2> ...`
run-parallel *RECIPES:
    just _prefix_strip_parallel "" {{ RECIPES }}

# Run shell commands in parallel. All die when any exits. Usage: `just concurrently-exec "<cmd1> <args>" "<cmd2> <args>" ...`
[positional-arguments]
concurrently-exec *CMDS:
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} "$@"

# Run shell commands in parallel. All die when any exits. Usage: `just concurrently-exec-named "<name 1>" "<cmd 1>" "<name 2>" "<cmd 2>" ...`
[positional-arguments]
concurrently-exec-named *NAMES_AND_CMDS:
    #!{{ ZSH_INIT }}
    names=() && cmds=()
    while (( {{ NUM_ARGS }} >= 2 )); do
        names+=("$1") && cmds+=("$2")
        shift 2
    done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

NUM_ARGS := "$#"

_prefix_strip_parallel PREFIX *RECIPES:
    #!{{ ZSH_INIT }}
    p="{{ PREFIX }}"; recipes=({{ RECIPES }})
    for r in "${recipes[@]}"; do cmds+=("just $r"); names+=("${r#$p}"); done
    exec {{ CONCURRENTLY_RUN_AND_STOP_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"
