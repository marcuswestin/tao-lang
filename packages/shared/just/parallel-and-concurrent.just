import "./_shared-vars.just"

CONCURRENTLY_COLORS := '--prefix-colors "#4FC3F7,#81C784,#FFD54F,#FF8A65,#BA68C8,#4DD0E1,#F06292,#AED581,#7986CB,#FFB74D"'
CONCURRENTLY_SUCCESS_ALL := "--success all"
CONCURRENTLY_SUCCESS_FIRST := "--success first"
CONCURRENTLY_KILL_ON_FAIL := "--kill-others-on-fail"
CONCURRENTLY_EXIT_ALL_TOGETHER := "--kill-others --kill-others-on-fail"

# Hide Justfile auto-fmt watcher success spam (still runs; only output is suppressed).

CONCURRENTLY_HIDE_FMT_WATCHER := "--hide fmt_justfile"
CONCURRENTLY_CMD := "./packages/shared/node_modules/.bin/concurrently"
CONCURRENTLY_RUN_ALL_CMD := CONCURRENTLY_CMD + " " + CONCURRENTLY_COLORS + " " + CONCURRENTLY_SUCCESS_ALL + " " + CONCURRENTLY_KILL_ON_FAIL + " " + CONCURRENTLY_HIDE_FMT_WATCHER

# Watch tests: clock + suite name on every line (re-runs get new timestamps); no --hide/--group (group buffers until a process exits).

CONCURRENTLY_WATCH_TESTS_CMD := CONCURRENTLY_CMD + " " + CONCURRENTLY_COLORS + " " + CONCURRENTLY_SUCCESS_FIRST + " " + CONCURRENTLY_EXIT_ALL_TOGETHER + " --pad-prefix --prefix \"[{time}] {name}\" --timestamp-format \"HH:mm:ss.SSS\""

# Run recipes in parallel. All must succeed; siblings are stopped on failure. Usage: `just run-parallel <recipe1> <recipe2> ...`
run-parallel *RECIPES:
    just _prefix_strip_parallel "" {{ RECIPES }}

# Run shell commands in parallel. All must succeed; siblings are stopped on failure. Usage: `just concurrently-exec "<cmd1> <args>" "<cmd2> <args>" ...`
[positional-arguments]
concurrently-exec *CMDS:
    exec {{ CONCURRENTLY_RUN_ALL_CMD }} "$@"

# Run shell commands in parallel. All must succeed; siblings are stopped on failure. Usage: `just concurrently-exec-named "<name 1>" "<cmd 1>" "<name 2>" "<cmd 2>" ...`
[positional-arguments]
concurrently-exec-named *NAMES_AND_CMDS:
    #!{{ ZSH_INIT }}
    names=() && cmds=()
    while (( {{ NUM_ARGS }} >= 2 )); do
        names+=("$1") && cmds+=("$2")
        shift 2
    done
    exec {{ CONCURRENTLY_RUN_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

# Same as concurrently-exec-named but with timestamped prefixes for long-running watch output.
[positional-arguments]
concurrently-exec-named-watch-tests *NAMES_AND_CMDS:
    #!{{ ZSH_INIT }}
    names=() && cmds=()
    while (( {{ NUM_ARGS }} >= 2 )); do
        names+=("$1") && cmds+=("$2")
        shift 2
    done
    exec {{ CONCURRENTLY_WATCH_TESTS_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"

NUM_ARGS := "$#"

_prefix_strip_parallel PREFIX *RECIPES:
    #!{{ ZSH_INIT }}
    p="{{ PREFIX }}"; recipes=({{ RECIPES }})
    for r in "${recipes[@]}"; do cmds+=("just $r"); names+=("${r#$p}"); done
    exec {{ CONCURRENTLY_RUN_ALL_CMD }} \
        --names "$(IFS=,; echo "${names[*]}")" \
        "${cmds[@]}"
