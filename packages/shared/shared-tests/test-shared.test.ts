import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'

describe('shared:', () => {
  test('FS.tmpdir resolves to a non-empty path', () => {
    expect(FS.tmpdir().length).toBeGreaterThan(0)
  })
})
