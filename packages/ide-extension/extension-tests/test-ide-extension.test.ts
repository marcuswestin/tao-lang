import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'

describe('ide-extension:', () => {
  test('bundled TextMate grammar json exists', () => {
    const p = FS.resolvePath(import.meta.dir, '../ide-syntaxes/_gen-syntaxes/tao-lang.tmLanguage.json')
    expect(FS.isFile(p)).toBe(true)
  })
})
