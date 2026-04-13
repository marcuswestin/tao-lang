import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'
import { TaoSDK_compile } from '../cli-src/tao-cli-main'

describe('cli:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('compile and run with cli', async () => {
    const { code, needle } = getRandomUI()
    const dir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-test-'))
    try {
      const taoPath = FS.joinPath(dir, 'app.tao')
      FS.writeFile(taoPath, code)
      const res = await TaoSDK_compile({ path: taoPath, runtimeDir: FS.resolvePath(__dirname, '../../expo-runtime/') })
      expect(res.files.some(f => f.content.includes(needle))).toBe(true)
    } finally {
      FS.rmDirectory(dir)
    }
  })

  test('compile file with use statement', async () => {
    const path = FS.resolvePath(__dirname, '../../../Apps/Test Apps/Kitchen Sink/app.tao')
    const stdLibRoot = FS.resolvePath(__dirname, '../../../packages/tao-std-lib')
    const res = await TaoSDK_compile({ path, runtimeDir: FS.resolvePath(__dirname, '../../expo-runtime/'), stdLibRoot })
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
