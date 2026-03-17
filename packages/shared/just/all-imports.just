set shell := ["zsh", "-e", "-u", "-o", "pipefail", "-c"]
set dotenv-load := true
set quiet := true
set unstable := true
set fallback := true

import "./setups.just"
import "./ps-grep-and-filter.just"
import "./dev-cmds.just"
import "./fix-fmt-check.just"
import "./dev-watch.just"
import "./parallel-and-concurrent.just"
