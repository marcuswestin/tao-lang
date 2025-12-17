import { describe, expect, test } from 'bun:test'

describe('runtime', () => {
  test('stub test', () => expect(true).toBe(true))

  test('run jest tests', () => {
    const result = Bun.spawnSync(['just', 'test'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      cwd: __dirname,
    })
    expect(result.exitCode).toBe(0)
    expect(true).toBe(true)
  })
})
