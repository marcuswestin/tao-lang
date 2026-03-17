import { Assert } from '@shared/TaoErrors'
import * as LangiumGen from 'langium/generate'
import { getErrorAppString } from './app-typescript-gen/app-gen-error'
import { generateTypescriptReactNativeApp } from './app-typescript-gen/app-gen-main'
import { TaoErrorReport } from './parse-errors'
import { TaoParser } from './parser'

export type CompileResult = {
  code: string
  errorReport: TaoErrorReport
}

export type CompileOpts = {
  file: string
  stdLibRoot?: string
}

/** compileTao parses `opts.file` (optional `stdLibRoot` for imports) and emits RN TypeScript when clean; if the parser or
 * validator reported errors, `code` is still a string but is the error-app source from `getErrorAppString`, and
 * `errorReport.hasError()` is true. */
export async function compileTao(opts: CompileOpts): Promise<CompileResult> {
  const parsed = await TaoParser.parseFile(opts.file, { stdLibRoot: opts.stdLibRoot })
  if (parsed.errorReport.hasError()) {
    return { errorReport: parsed.errorReport, code: getErrorAppString(parsed.errorReport) }
  }
  Assert(parsed.taoFileAST, 'taoFileAST is defined', parsed)
  const compiledApp = generateTypescriptReactNativeApp(parsed.taoFileAST, parsed.usedFilesASTs)
  const result = LangiumGen.toStringAndTrace(compiledApp)
  // TODO: implement tracing
  return { code: result.text, errorReport: parsed.errorReport }
}
