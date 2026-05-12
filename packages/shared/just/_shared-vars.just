set shell := ["zsh", "-e", "-u", "-o", "pipefail", "-c"]
set dotenv-load
set quiet
set unstable
set fallback

ZSH_INIT := "/bin/zsh -eu -o pipefail"
DEV_METRO_PORT := "8081"
# Local InstantDB seeded app UUID (`just instantdb-local`, `just dev` compile overrides). Keep in sync with `Apps/Test Apps/Data Schema/Data Schema.tao` provider appId. Defined here so imported justfiles (e.g. `dev-watch.just`) can interpolate it; root `Justfile` also uses this value.
LOCAL_INSTANTDB_APP_ID := "9faf89c0-c15c-49b4-bf3f-3b5b2cd9a19f"
