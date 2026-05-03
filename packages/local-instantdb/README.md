# Local InstantDB

This package runs a deterministic local InstantDB backend for Tao app and e2e development.

It provides:

- Postgres with InstantDB-required logical replication settings.
- InstantDB server pinned to a known commit.
- A stable app id that Tao apps can compile against.
- Local dev recipes that compile Tao apps with `InstantDB` provider overrides.

## Commands

Run from `packages/local-instantdb`.

```sh
just up
```

Starts Postgres, builds/runs InstantDB, waits for `/health`, and seeds the deterministic app.

```sh
just dev
```

Starts the local backend, compiles `Apps/Test Apps/Data Schema/Data Schema.tao` with local InstantDB provider overrides, watches the Tao source, and starts Expo web on `http://localhost:8081`.

Useful variants:

```sh
just config
just image
just compile
just watch
just web
just status
just logs
just down
just reset
just reset-caches
```

For a physical device on the same Wi-Fi network, pass your computer's LAN IP so the generated app points at the computer instead of the device:

```sh
just dev HOST=192.168.x.x
```

To run a different Tao app:

```sh
just dev APP="../../Apps/DevApp/DevApp.tao"
```

## Local App Configuration

The seeded app uses:

```txt
appId=9faf89c0-c15c-49b4-bf3f-3b5b2cd9a19f
apiURI=http://localhost:9020
websocketURI=ws://localhost:9020/runtime/session
```

The `compile`, `watch`, and `dev` recipes pass these values through Tao CLI app overrides:

```sh
--app provider.name=InstantDB
--app provider.appId="$APP_ID"
--app provider.apiURI="http://$HOST:$INSTANT_PORT"
--app provider.websocketURI="ws://$HOST:$INSTANT_PORT/runtime/session"
```

## React Native Network Listener

InstantDB's React Native client listens to device network state. For local-only browser or web harnesses, patch Instant before `init` if the browser/device reports offline while the local InstantDB server is reachable:

```ts
import { InstantReactNativeDatabase } from '@instantdb/react-native'

class AlwaysOnlineNetworkListener {
  static async getIsOnline() {
    return true
  }

  static listen() {
    return () => {}
  }
}

InstantReactNativeDatabase.NetworkListener = AlwaysOnlineNetworkListener
```

For offline queue testing, use a controlled listener instead and toggle it from the test harness.

## Notes

- `vendor/instant` is intentionally ignored and is fetched by `just bootstrap`.
- Local Postgres data lives in the Docker volume `local-instantdb-postgres`.
- Maven/Clojure dependency caches live in named Docker volumes so repeated starts do not re-download the same artifacts.
- `just image` builds the warm InstantDB dev image with Clojure dev/build deps preloaded.
- `just reset` deletes only the Postgres data volume.
- `just reset-caches` deletes Postgres and dependency cache volumes.
- If a phone uses `localhost`, it points at the phone. Use `HOST=<computer LAN IP>` for device testing.
