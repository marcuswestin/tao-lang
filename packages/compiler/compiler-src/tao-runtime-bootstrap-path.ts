import { FS } from '@shared'

/** TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH is the path under a runtime package root where `TaoSDK_compile` writes the bootstrap by default. */
export const TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH = '_gen/tao-app/app-bootstrap.tsx'

/** resolveTaoRuntimeBootstrapAbsolutePath joins `runtimeDir` with {@link TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH}. */
export function resolveTaoRuntimeBootstrapAbsolutePath(runtimeDir: string): string {
  return FS.resolvePath(runtimeDir, TAO_RUNTIME_BOOTSTRAP_RELATIVE_PATH)
}
