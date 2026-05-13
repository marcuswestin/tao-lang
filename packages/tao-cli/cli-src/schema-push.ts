import { type CompileResult, compileTao, type TaoAppConfigObject } from '@compiler'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import { MemoryTaoDataAdmin } from '../../tao-std-lib/tao/data/providers/in-memory/admin/in-memory'
import { InstantDBTaoAdmin } from '../../tao-std-lib/tao/data/providers/instantdb/admin/InstantDBTaoAdmin'
import type { TaoDataAdmin } from '../../tao-std-lib/tao/data/providers/tao-data-client'

type SuccessfulCompileResult = Extract<CompileResult, { ok: true }>

export type TaoSDK_pushSchemaOpts = {
  file: string
  stdLibRoot: string
  app: TaoAppConfigObject
  overwrite?: boolean
}

export type TaoSDK_pushSchemaResult = {
  provider: string
  schemaNames: string[]
  result: unknown
}

/** TaoSDK_pushSchema compiles a Tao app and pushes its serialized data schemas through the app provider admin. */
export async function TaoSDK_pushSchema(opts: TaoSDK_pushSchemaOpts): Promise<TaoSDK_pushSchemaResult> {
  const result = await compileTao(opts)
  if (!result.ok) {
    throwUserInputRejectionError(result.errorReport.getHumanErrorMessage())
  }
  return await pushCompiledSchema(result, opts.overwrite === true)
}

/** pushCompiledSchema pushes schemas already collected by a successful compile. */
export async function pushCompiledSchema(
  compileResult: SuccessfulCompileResult,
  overwrite: boolean,
): Promise<TaoSDK_pushSchemaResult> {
  const admin = createTaoDataAdmin(compileResult.appDataProvider.name)
  const result = await pushSchemaWithUserFacingError(admin, compileResult, overwrite)
  return {
    provider: compileResult.appDataProvider.name,
    schemaNames: compileResult.dataSchemas.map(schema => schema.name),
    result,
  }
}

/** createTaoDataAdmin returns the compile-time admin implementation for a provider name. */
function createTaoDataAdmin(provider: string): TaoDataAdmin {
  const normalized = provider.toLowerCase()
  if (normalized === 'memory') {
    return new MemoryTaoDataAdmin()
  }
  if (normalized === 'instantdb') {
    return new InstantDBTaoAdmin()
  }
  throwUserInputRejectionError(`Unknown app data provider '${provider}'. Known providers: Memory, InstantDB.`)
}

/** pushSchemaWithUserFacingError preserves provider/admin validation failures and reports provider API failures clearly. */
async function pushSchemaWithUserFacingError(
  admin: TaoDataAdmin,
  compileResult: SuccessfulCompileResult,
  overwrite: boolean,
): Promise<unknown> {
  try {
    return await admin.pushSchema({
      schemas: compileResult.dataSchemas,
      params: compileResult.appDataProvider.params,
      overwrite,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'UserInputRejectionError') {
      throw error
    }
    throwUserInputRejectionError(
      `Schema push failed for provider '${compileResult.appDataProvider.name}': ${unknownErrorMessage(error)}`,
    )
  }
}

/** unknownErrorMessage returns a readable message from provider/API errors. */
function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
