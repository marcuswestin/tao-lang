import { describe, lexTokens, lexTokensWithErrors, test } from './test-utils/test-harness'

describe('Lexer', () => {
  describe('valid tokens', () => {
    test('lexes identifiers', async () => {
      await lexTokens(`_foo bar123 _under_score`)
    })

    test('lexes double-quoted strings', async () => {
      await lexTokens(`"hello world"`)
    })

    test('lexes single-quoted strings', async () => {
      await lexTokens(`'hello world'`)
    })

    test('lexes strings with escapes', async () => {
      await lexTokens(`"hello \\"world\\""`)
    })

    test('lexes numbers', async () => {
      await lexTokens(`42 0 999`)
    })

    test('ignores single-line comments', async () => {
      await lexTokens(`// this is a comment`)
    })

    test('ignores multi-line comments', async () => {
      await lexTokens(`/* multi\nline\ncomment */`)
    })

    test('lexes ts code block', async () => {
      await lexTokens('```ts\nconst x = 1\n```')
    })
  })

  describe('lexer errors', () => {
    test('rejects unknown character @', async () => {
      await lexTokensWithErrors(`@`, '@')
    })

    test('rejects unknown character #', async () => {
      await lexTokensWithErrors(`#`, '#')
    })

    test('rejects unknown character $', async () => {
      await lexTokensWithErrors(`$`, '$')
    })

    test('unclosed double-quoted string', async () => {
      await lexTokensWithErrors(`"hello`, '"')
    })

    test('unclosed single-quoted string', async () => {
      await lexTokensWithErrors(`'world`, "'")
    })

    test('unclosed multi-line comment', async () => {
      await lexTokensWithErrors(`/* comment without end`, '/')
    })

    test('unclosed ts code block', async () => {
      await lexTokensWithErrors('```ts\nconst x = 1', '`', '=')
    })
  })
})
