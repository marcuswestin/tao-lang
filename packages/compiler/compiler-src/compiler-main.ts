import { TaoLangTerminals } from './_gen-tao-parser/ast'

export type File = {
  path: string
}

export type CompileResult = {
  code: string
}

export function compile(opts: { file: File }): CompileResult {
  const { file } = opts
  console.log(TaoLangTerminals)
  return { code: `TODO: Compile ${file.path}` }
}
