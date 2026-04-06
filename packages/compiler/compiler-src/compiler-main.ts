import { Assert } from '@shared/TaoErrors'
import * as LangiumGen from 'langium/generate'
import * as path from 'node:path'
import { getErrorAppString } from './app-typescript-gen/app-gen-error'
import { generateTypescriptReactNativeApp } from './app-typescript-gen/app-gen-main'
import { TaoErrorReport } from './parse-errors'
import { TaoParser } from './parser'

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
  const entryAbsolutePath = path.resolve(opts.file)
  const generated = generateTypescriptReactNativeApp(
    parsed.taoFileAST,
    parsed.usedFilesASTs,
    entryAbsolutePath,
    opts.stdLibRoot,
  )
  const files: CompileOutputFile[] = []
  for (const f of generated.fileNodes) {
    files.push({ relativePath: f.relativePath, content: LangiumGen.toStringAndTrace(f.node).text })
  }
  files.push({
    relativePath: generated.bootstrapRelativePath,
    content: LangiumGen.toStringAndTrace(generated.bootstrapNode).text,
  })
  return {
    ok: true,
    errorReport: parsed.errorReport,
    files,
    entryRelativePath: generated.bootstrapRelativePath,
  }
}
