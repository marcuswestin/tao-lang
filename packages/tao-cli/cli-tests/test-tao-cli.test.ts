import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve as resolvePath } from 'node:path'
import { TaoSDK_compile } from '../cli-src/tao-cli-main'

describe('cli:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('compile and run with cli', async () => {
    const { code, needle } = getRandomUI()
    const dir = mkdtempSync(join(tmpdir(), 'tao-cli-test-'))
    try {
      const taoPath = join(dir, 'app.tao')
      writeFileSync(taoPath, code)
      const res = await TaoSDK_compile({ path: taoPath, runtimeDir: resolvePath(__dirname, '../../expo-runtime/') })
      expect(res.files.some(f => f.content.includes(needle))).toBe(true)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  test('compile file with use statement', async () => {
    const path = resolvePath(__dirname, '../../../Apps/Test Apps/Kitchen Sink/app.tao')
    const stdLibRoot = resolvePath(__dirname, '../../../packages/tao-std-lib')
    const res = await TaoSDK_compile({ path, runtimeDir: resolvePath(__dirname, '../../expo-runtime/'), stdLibRoot })
    expect(res.files.length).toBeGreaterThan(0)
  })
})

function getRandomUI() {
  const needle = Math.random().toString(36).substring(2, 15)
  const code = `
    app KitchenSink { ui RootView }

    view RootView { Text value "${needle}" {} }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  return { code, needle }
}
