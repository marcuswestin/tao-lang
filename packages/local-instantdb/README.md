# Local InstantDB

This package runs a deterministic local InstantDB backend for Tao app and e2e development.

It provides:

- Postgres with InstantDB-required logical replication settings.
- InstantDB server pinned to a known commit.
- A stable app id that Tao apps can compile against.

## Commands

Start server, wait for `/health`, and seed the deterministic app:

```sh
just up
```

Useful dev commands:

```sh
just config
just image
just status
just logs
just down
just reset
just reset-caches
```

## Local App Configuration

The seeded app uses:

```txt
appId=9faf89c0-c15c-49b4-bf3f-3b5b2cd9a19f
apiURI=http://localhost:9020
websocketURI=ws://localhost:9020/runtime/session
```
