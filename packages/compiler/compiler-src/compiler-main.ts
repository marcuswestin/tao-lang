import { toStringAndTrace, type TraceRegion } from '@parser/generate'
import { Assert, FS } from '@shared'
import type { TaoAppConfigObject } from './codegen/app/app-config'
import { getErrorAppString } from './codegen/app/app-gen-error'
import { generateTypescriptReactNativeApp } from './codegen/app/app-gen-main'
import { collectSerializedDataSchemas, type TaoSerializedDataSchema } from './codegen/app/data-schema-serialization'
import type { TaoResolvedAppProvider } from './codegen/app/runtime-gen'
import { acceptedDesignLockFromSuggestions, analyzeTaoDesign, type TaoDesignDiagnostic } from './design/design-analysis'
import { compileTaoDesignModule, TAO_DESIGN_MODULE_RELATIVE_PATH } from './design/design-codegen'
import {
  designLockPaths,
  makeEmptyDesignLock,
  sortedEntries,
  type TaoDesignLock,
  type TaoDesignMode,
  writeDesignLock,
} from './design/design-lock'
import type { TaoDesignSuggestionProvider } from './design/design-suggestion-provider'
import { TaoParser } from './langium/parser'
import { type ParseError, parseErrorFromMessages } from './validation/parse-errors'

export type { TaoDesignDiagnostic } from './design/design-analysis'
export type { TaoDesignMode } from './design/design-lock'

export type CompileOutputFile = {
  relativePath: string
  content: string
  trace?: TraceRegion
}

export type CompileResult =
  | {
    ok: true
    errorReport: ParseError
    files: CompileOutputFile[]
    /** Relative path within `tao-app/` for the bootstrap file (e.g. `app-bootstrap.tsx`). */
    entryRelativePath: string
    copyDirs: { fromAbsolutePath: string; toRelativePath: string }[]
    copyFiles: { fromAbsolutePath: string; toRelativePath: string }[]
    appDataProvider: TaoResolvedAppProvider
    dataSchemas: TaoSerializedDataSchema[]
  }
  | {
    ok: false
    errorReport: ParseError
    /** Error-app TSX from `getErrorAppString`. */
    code: string
  }

export type CompileOpts = {
  file: string
  stdLibRoot?: string
  /** App config overrides, e.g. `{ provider: { appId: "test-db" } }`. */
  app?: TaoAppConfigObject
  /** Design mode. Development uses deterministic suggestions as fallback; production requires accepted lock entries. */
  designMode?: TaoDesignMode
  /** Directory containing `tao.design.lock` and `.tao.design.lock`. Defaults beside the entry Tao file. */
  designLockDir?: string
}

export type TaoDesignCommandResult = {
  acceptedPath: string
  suggestionPath: string
  lock: TaoDesignLock
  diagnostics: TaoDesignDiagnostic[]
}

/** compileTao parses `opts.file` (optional `stdLibRoot` for imports) and emits RN TypeScript when clean; on error returns
 * `ok: false` with `code` set to the error-app source from `getErrorAppString`. */
export async function compileTao(opts: CompileOpts): Promise<CompileResult> {
  const parsed = await TaoParser.parseFile(opts.file, { stdLibRoot: opts.stdLibRoot })
  if (parsed.errorReport.hasError()) {
    return {
      ok: false,
      errorReport: parsed.errorReport,
      code: getErrorAppString(parsed.errorReport),
    }
  }
  Assert(parsed.taoFileAST, 'taoFileAST is defined', parsed as Record<string, unknown>)
  const entryAbsolutePath = FS.resolvePath(opts.file)
  const design = analyzeTaoDesign({
    entryAbsolutePath,
    importedTaoFiles: parsed.usedFilesASTs,
    lockDir: opts.designLockDir,
    mainTaoFile: parsed.taoFileAST,
    mode: opts.designMode ?? 'development',
    stdLibRoot: opts.stdLibRoot,
  })
  const designErrors = design.diagnostics.filter(d => d.severity === 'error')
  if (designErrors.length > 0) {
    const errorReport = parseErrorFromMessages(designErrors.map(d => d.message))
    return {
      ok: false,
      errorReport,
      code: getErrorAppString(errorReport),
    }
  }
  const generated = generateTypescriptReactNativeApp(
    parsed.taoFileAST,
    parsed.usedFilesASTs,
    entryAbsolutePath,
    opts.stdLibRoot,
    opts.app ? { app: opts.app } : undefined,
    {
      effectiveLock: design.effectiveLock,
      identityByNode: design.identityByNode,
    },
  )
  const files: CompileOutputFile[] = []
  for (const f of generated.fileNodes) {
    const { text, trace } = toStringAndTrace(f.node)
    files.push({ relativePath: f.relativePath, content: text, trace })
  }
  files.push({
    relativePath: generated.bootstrapRelativePath,
    content: toStringAndTrace(generated.bootstrapNode).text,
  })
  files.push({
    relativePath: TAO_DESIGN_MODULE_RELATIVE_PATH,
    content: toStringAndTrace(compileTaoDesignModule(design.effectiveLock)).text,
  })
  const copyDirs = [
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/tao-runtime'),
      toRelativePath: FS.joinPath('use', '@tao', 'tao-runtime'),
    },
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/in-memory/client'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'in-memory', 'client'),
    },
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/instantdb/client'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'instantdb', 'client'),
    },
  ]
  const copyFiles = [
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/all.ts'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'all.ts'),
    },
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/tao-data-client.ts'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'tao-data-client.ts'),
    },
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/tao-query.ts'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'tao-query.ts'),
    },
    {
      fromAbsolutePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/data/providers/tao-query-projection.ts'),
      toRelativePath: FS.joinPath('use', '@tao', 'data', 'providers', 'tao-query-projection.ts'),
    },
  ]
  return {
    ok: true,
    errorReport: parsed.errorReport,
    files,
    entryRelativePath: generated.bootstrapRelativePath,
    copyDirs,
    copyFiles,
    appDataProvider: generated.codegenOpts.appProvider,
    dataSchemas: collectSerializedDataSchemas([parsed.taoFileAST, ...parsed.usedFilesASTs]),
  }
}

/** generateTaoDesignSuggestions writes `.tao.design.lock` for the entry Tao file and returns the review data. */
export async function generateTaoDesignSuggestions(opts: {
  file: string
  stdLibRoot?: string
  designLockDir?: string
  suggestionProvider?: TaoDesignSuggestionProvider
}): Promise<TaoDesignCommandResult> {
  const parsed = await TaoParser.parseFile(opts.file, { stdLibRoot: opts.stdLibRoot })
  if (parsed.errorReport.hasError()) {
    throw new Error(parsed.errorReport.getHumanErrorMessage())
  }
  Assert(parsed.taoFileAST, 'taoFileAST is defined', parsed as Record<string, unknown>)
  const entryAbsolutePath = FS.resolvePath(opts.file)
  const paths = designLockPaths(opts.designLockDir ?? FS.dirname(entryAbsolutePath))
  const design = analyzeTaoDesign({
    entryAbsolutePath,
    importedTaoFiles: parsed.usedFilesASTs,
    lockDir: paths.lockDir,
    mainTaoFile: parsed.taoFileAST,
    mode: 'development',
    stdLibRoot: opts.stdLibRoot,
  })
  const suggestionLock = opts.suggestionProvider === undefined
    ? design.suggestionLock
    : await generateProviderSuggestionLock(opts.suggestionProvider, design)
  writeDesignLock(paths.suggestionPath, suggestionLock)
  return {
    acceptedPath: paths.acceptedPath,
    diagnostics: design.diagnostics,
    lock: suggestionLock,
    suggestionPath: paths.suggestionPath,
  }
}

/** acceptTaoDesignSuggestions accepts current deterministic suggestions into `tao.design.lock`. */
export async function acceptTaoDesignSuggestions(opts: {
  file: string
  stdLibRoot?: string
  designLockDir?: string
  suggestionProvider?: TaoDesignSuggestionProvider
}): Promise<TaoDesignCommandResult> {
  const review = await generateTaoDesignSuggestions(opts)
  const accepted = acceptedDesignLockFromSuggestions(review.lock)
  writeDesignLock(review.acceptedPath, accepted)
  return {
    ...review,
    lock: accepted,
  }
}

async function generateProviderSuggestionLock(
  provider: TaoDesignSuggestionProvider,
  design: ReturnType<typeof analyzeTaoDesign>,
): Promise<TaoDesignLock> {
  const result = await provider({
    acceptedLock: design.acceptedLock,
    appDesignDescription: design.appDesignDescription,
    deterministicEntries: design.requiredEntries,
    requirements: design.requirements,
  })
  const lock = makeEmptyDesignLock({ description: design.appDesignDescription })
  lock.analyzer = result.analyzer
  lock.entries = sortedEntries(result.entries)
  lock.generatedAt = new Date(0).toISOString()
  return lock
}
