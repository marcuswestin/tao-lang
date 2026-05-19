import "./env-guards.just"

# Appended to `bun install` when `TAO_DEPS_BATCHED=1` (full-repo `_build_all`) or `TAO_AGENT=1`: quieter installs; per-package `_bun_deps` still skips install entirely in batched mode.

[private]
_bun_install_silent_suffix := if env_var_or_default("TAO_DEPS_BATCHED", "") == "1" { "--silent" } else { _BUN_INSTALL_AGENT_SUFFIX }

_bun_deps:
    just _skip_if_env_eq TAO_DEPS_BATCHED 1 || bun install {{ _bun_install_silent_suffix }}
