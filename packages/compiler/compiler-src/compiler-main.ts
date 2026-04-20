import { toStringAndTrace, type TraceRegion } from '@parser/generate'
import { Assert, FS } from '@shared'
import { getErrorAppString } from './codegen/app/app-gen-error'
import { generateTypescriptReactNativeApp } from './codegen/app/app-gen-main'
import { TaoParser } from './langium/parser'
import { ParseError } from './validation/parse-errors'

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
    copyDirs: { fromRelativePath: string; toRelativePath: string }[]
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
  const generated = generateTypescriptReactNativeApp(
    parsed.taoFileAST,
    parsed.usedFilesASTs,
    entryAbsolutePath,
    opts.stdLibRoot,
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
  const copyDirs = [
    {
      fromRelativePath: FS.joinPath(__dirname, '../../tao-std-lib/tao/tao-runtime'),
      toRelativePath: FS.joinPath('use', '@tao', 'tao-runtime'),
    },
  ]
  return {
    ok: true,
    errorReport: parsed.errorReport,
    files,
    entryRelativePath: generated.bootstrapRelativePath,
    copyDirs,
  }
}
