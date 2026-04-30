// Tests for the test harness: ensure lexTokensWithErrors actually validates unexpected characters.

import { describe, expect, test } from 'bun:test'
import { lexTokensWithErrors } from './test-harness'

describe('lexTokensWithErrors', () => {
  test('passes when expected character appears in error (at offset)', async () => {
    await lexTokensWithErrors(`@`, '@')
  })

  test('passes when expected character is in error message', async () => {
    // Unclosed TS injection fence produces a lexer error involving the backtick character.
    await lexTokensWithErrors('```ts\nconst x = 1', '`')
  })

  test('fails when expected character is not in any error', () => {
    // Code has @ (unknown char), but we wrongly expect 'x' – should throw
    return expect(lexTokensWithErrors(`@`, 'x')).rejects.toThrow(/expected an error involving "x"/)
  })

  test('fails when one of multiple expected characters is missing', () => {
    // Unclosed ts block: errors involve ` and maybe =, but not 'z'
    return expect(lexTokensWithErrors('```ts\nconst x = 1', '`', 'z')).rejects.toThrow(
      /expected an error involving "z"/,
    )
  })

  test('fails when there are no lex errors at all', () => {
    return expect(lexTokensWithErrors(`valid code`, '@')).rejects.toThrow(/expected lexing errors, but got none/)
  })
})
