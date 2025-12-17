import { TaoParser } from '@tao-compiler/parser'
import { describe, expect, test } from './test-utils/test-harness'

async function lex(code: string) {
  const result = await TaoParser.parseString(code, { validate: 'lexing', suppressThrowOnError: true })
  return result.errorReport?.lexerErrors ?? []
}

async function lexWithError(code: string, ...unexpectedCharacters: string[]) {
  const lexErrors = await lex(code)
  expect(lexErrors).toHaveLength(unexpectedCharacters.length)
  lexErrors.forEach((error, i) => {
    expect(error.message).toContain(`unexpected character: ->${unexpectedCharacters[i]}<- at offset: `)
  })
}

describe('Lexer', () => {
  describe('valid tokens', () => {
    test('lexes identifiers', async () => {
      expect(await lex(`_foo bar123 _under_score`)).toBeEmpty()
    })

    test('lexes double-quoted strings', async () => {
      expect(await lex(`"hello world"`)).toBeEmpty()
    })

    test('lexes single-quoted strings', async () => {
      expect(await lex(`'hello world'`)).toBeEmpty()
    })

    test('lexes strings with escapes', async () => {
      expect(await lex(`"hello \\"world\\""`)).toBeEmpty()
    })

    test('lexes numbers', async () => {
      expect(await lex(`42 0 999`)).toBeEmpty()
    })

    test('ignores single-line comments', async () => {
      expect(await lex(`// this is a comment`)).toBeEmpty()
    })

    test('ignores multi-line comments', async () => {
      expect(await lex(`/* multi\nline\ncomment */`)).toBeEmpty()
    })

    test('lexes ts code block', async () => {
      expect(await lex('```ts\nconst x = 1\n```')).toBeEmpty()
    })
  })

  describe('lexer errors', () => {
    test('rejects unknown character @', async () => {
      await lexWithError(`@`, '@')
    })

    test('rejects unknown character #', async () => {
      await lexWithError(`#`, '#')
    })

    test('rejects unknown character $', async () => {
      await lexWithError(`$`, '$')
    })

    test('unclosed double-quoted string', async () => {
      await lexWithError(`"hello`, '"')
    })

    test('unclosed single-quoted string', async () => {
      await lexWithError(`'world`, "'")
    })

    test('unclosed multi-line comment', async () => {
      await lexWithError(`/* comment without end`, '/')
    })

    test('unclosed ts code block', async () => {
      await lexWithError('```ts\nconst x = 1', '`', '=')
    })
  })
})
