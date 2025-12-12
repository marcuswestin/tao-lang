import { isTaoFile } from '@tao-compiler/_gen-tao-parser/ast'
import { createTaoServices } from '@tao-compiler/tao-services'
import { describe, expect, test } from 'bun:test'
import { expandToString as s } from 'langium/generate'
import { parseHelper } from 'langium/test'
import { EmptyFileSystem, type LangiumDocument } from 'node_modules/langium/lib/workspace'
import type { Diagnostic } from 'vscode-languageserver-types'

describe('compiler:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('check app must have at least one statement', async () => {
    const services = createTaoServices(EmptyFileSystem)
    const doParse = parseHelper(services.Tao)
    const parse = (input: string) => doParse(input, { validation: true })

    const document = await parse(`
      app MyApp {}
    `)

    expect(
      checkDocumentValid(document) || document?.diagnostics?.map(diagnosticToString)?.join('\n'),
    ).toContain('App must have at least one statement.')
  })

  test('check app with a statement is ok', async () => {
    const services = createTaoServices(EmptyFileSystem)
    const doParse = parseHelper(services.Tao)
    const parse = (input: string) => doParse(input, { validation: true })

    const document = await parse(`
      app MyApp {
        root RootView
      }
    `)

    expect(
      checkDocumentValid(document) || document?.diagnostics?.map(diagnosticToString)?.join('\n'),
    ).toEqual('')
  })
})

function checkDocumentValid(document: LangiumDocument): string | undefined {
  return document.parseResult.parserErrors.length && s`
        Parser errors:
          ${document.parseResult.parserErrors.map(e => e.message).join('\n  ')}
    `
    || document.parseResult.value === undefined && `ParseResult is 'undefined'.`
    || !isTaoFile(document.parseResult.value)
      && `Root AST object is a ${document.parseResult.value.$type}, expected a 'TaoLang'.`
    || undefined
}

function diagnosticToString(d: Diagnostic) {
  return `[${d.range.start.line}:${d.range.start.character}..${d.range.end.line}:${d.range.end.character}]: ${d.message}`
}
