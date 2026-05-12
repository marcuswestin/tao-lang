# Local InstantDB

This package runs a deterministic local InstantDB backend for Tao app and e2e development.

It provides:

- Postgres with InstantDB-required logical replication settings.
- InstantDB server pinned to a known commit.
- A stable app id that Tao apps can compile against.
- `INSTANT_PORT` and related values live in `.env`; the seeded app UUID is `LOCAL_INSTANTDB_APP_ID` in `packages/shared/just/_shared-vars.just` (single definition for all imported justfiles and the root `Justfile`) and is passed as `APP_ID` by `just instantdb-local` and `just dev`.

## Commands

```sh
just instantdb-local up
```

Starts Postgres, builds/runs InstantDB, waits for `/health`, and seeds the deterministic app.

For the full Expo + Tao compile/watch loop from the repository root:

```sh
just dev roPhone "./Apps/DevApp/DevApp.tao"
```

The first argument is the iOS device name/UDID and the second argument is the Tao app path. Use `just dev` for the default `roPhone` + Data Schema app.

## Notes

- `vendor/instant` is intentionally ignored and is fetched by `just bootstrap`.
- Local Postgres data lives in the Docker volume `local-instantdb-postgres`.
- Maven/Clojure dependency caches live in named Docker volumes so repeated starts do not re-download the same artifacts.
- `just image` builds the warm InstantDB dev image with Clojure dev/build deps preloaded.
- `just reset` deletes only the Postgres data volume.
- `just reset-caches` deletes Postgres and dependency cache volumes.
- If a phone uses `localhost`, it points at the phone; default `just dev` uses the detected iPhone-reachable IP. On macOS, `packages/shared/scripts/lan-ipv4.sh` prefers an active `169.254.x.x` link-local interface before the default-route Wi-Fi/VPN address.
