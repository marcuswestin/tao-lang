// Tests for the test harness: ensure lexTokensWithErrors actually validates unexpected characters.

import { describe, expect, test } from 'bun:test'
import { lexTokensWithErrors } from './test-harness'

describe('lexTokensWithErrors', () => {
  test('passes when expected character appears in error (at offset)', async () => {
    await lexTokensWithErrors(`@`, '@')
  })

  test('passes when expected character is in error message', async () => {
    // Unclosed string produces an error that involves the quote character
    await lexTokensWithErrors(`"unclosed`, '"')
  })

  test('fails when expected character is not in any error', async () => {
    // Code has @ (unknown char), but we wrongly expect 'x' – should throw
    await expect(lexTokensWithErrors(`@`, 'x')).rejects.toThrow(/expected an error involving "x"/)
  })

  test('fails when one of multiple expected characters is missing', async () => {
    // Unclosed ts block: errors involve ` and maybe =, but not 'z'
    await expect(lexTokensWithErrors('```ts\nconst x = 1', '`', 'z')).rejects.toThrow(/expected an error involving "z"/)
  })

  test('fails when there are no lex errors at all', async () => {
    await expect(lexTokensWithErrors(`valid code`, '@')).rejects.toThrow(/expected lexing errors, but got none/)
  })
})
