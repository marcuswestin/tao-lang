import { Assert } from '@shared/TaoErrors'
import { TraceRegion } from 'langium/generate'
import path from 'node:path'
import { getErrorAppString } from './codegen/app/app-gen-error'
import { generateTypescriptReactNativeApp } from './codegen/app/app-gen-main'
import { TaoParser } from './langium/parser'
import { langiumGen } from './util/libs'
import { TaoErrorReport } from './validation/parse-errors'

export type CompileOutputFile = {
  relativePath: string
  text: string
  trace?: TraceRegion | undefined
}

export type CompileResult =
  | {
    ok: true
    errorReport: TaoErrorReport
    files: CompileOutputFile[]
    /** `to` is relative to the tao-app emit root (`dirname` of the written bootstrap file). */
    copyDirs: { from: string; to: string }[]
    /** Relative path within `tao-app/` for the bootstrap file (e.g. `app-bootstrap.tsx`). */
    entryRelativePath: string
  }
  | {
    ok: false
    errorReport: TaoErrorReport
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
  Assert(parsed.taoFileAST, 'taoFileAST is defined', parsed)
  const entryAbsolutePath = path.resolve(opts.file)
  const generated = generateTypescriptReactNativeApp(
    parsed.taoFileAST,
    parsed.usedFilesASTs,
    entryAbsolutePath,
    opts.stdLibRoot,
  )
  const files: CompileOutputFile[] = []
  for (const f of generated.fileNodes) {
    files.push({ relativePath: f.relativePath, ...langiumGen.toStringAndTrace(f.node) })
  }
  files.push({
    relativePath: generated.bootstrapRelativePath,
    ...langiumGen.toStringAndTrace(generated.bootstrapNode),
  })
  const copyDirs = [
    {
      from: path.join(__dirname, '../../tao-std-lib/tao/tao-runtime'),
      to: path.join('use', '@tao', 'tao-runtime'),
    },
  ]
  return {
    ok: true,
    errorReport: parsed.errorReport,
    files,
    copyDirs,
    entryRelativePath: generated.bootstrapRelativePath,
  }
}
