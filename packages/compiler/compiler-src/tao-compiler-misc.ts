import { FS } from '@shared'

/** TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH is the path under a runtime package root where `TaoSDK_compile` writes the bootstrap by default. */
export const TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH = '_gen/tao-app/app-bootstrap.tsx'

/** resolveTaoRuntimeBootstrapAbsolutePath joins `runtimeDir` with {@link TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH}. */
export function resolveTaoRuntimeBootstrapAbsolutePath(runtimeDir: string): string {
  return FS.resolvePath(runtimeDir, TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH)
}

/** KNOWN_TAO_APP_DATA_PROVIDER_NAMES lists registered std-lib app data providers (lowercase). */
export const KNOWN_TAO_APP_DATA_PROVIDER_NAMES = ['memory', 'instantdb'] as const

/** isKnownTaoAppDataProviderName returns true when `name` matches a registered std-lib provider (case-insensitive). */
export function isKnownTaoAppDataProviderName(name: string): boolean {
  const n = name.toLowerCase()
  return (KNOWN_TAO_APP_DATA_PROVIDER_NAMES as readonly string[]).includes(n)
}

/** unknownTaoAppDataProviderMessage returns the diagnostic text for an unknown provider id. */
export function unknownTaoAppDataProviderMessage(name: string): string {
  return `Unknown app data provider '${name}'. Known providers: Memory, InstantDB.`
}
