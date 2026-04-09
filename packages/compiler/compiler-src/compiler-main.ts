import { Assert } from '@shared/TaoErrors'
import { getErrorAppString } from './app-typescript-gen/app-gen-error'
import { generateTypescriptReactNativeApp } from './app-typescript-gen/app-gen-main'
import { TaoErrorReport } from './parse-errors'
import { TaoParser } from './parser'
import { langiumGen, nodePath } from './util/libs'

export type CompileOutputFile = { relativePath: string; content: string }

export type CompileResult =
  | {
    ok: true
    errorReport: TaoErrorReport
    files: CompileOutputFile[]
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
  const entryAbsolutePath = nodePath.resolve(opts.file)
  const generated = generateTypescriptReactNativeApp(
    parsed.taoFileAST,
    parsed.usedFilesASTs,
    entryAbsolutePath,
    opts.stdLibRoot,
  )
  const files: CompileOutputFile[] = []
  for (const f of generated.fileNodes) {
    files.push({ relativePath: f.relativePath, content: langiumGen.toStringAndTrace(f.node).text })
  }
  files.push({
    relativePath: generated.bootstrapRelativePath,
    content: langiumGen.toStringAndTrace(generated.bootstrapNode).text,
  })
  return {
    ok: true,
    errorReport: parsed.errorReport,
    files,
    entryRelativePath: generated.bootstrapRelativePath,
  }
}
