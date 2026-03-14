import { describe, expect, test } from 'bun:test'
import { resolve as resolvePath } from 'node:path'
import { TaoSDK_compile } from '../cli-src/tao-cli-main'

describe('cli:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('compile and run with cli', async () => {
    const { code, needle } = getRandomUI()
    const res = await TaoSDK_compile({ code, runtimeDir: resolvePath(__dirname, '../../expo-runtime/') })
    expect(res.result).toBeDefined()
    expect(res.result?.code).toContain(needle)
  })

  test('compile file with use statement', async () => {
    const path = resolvePath(__dirname, '../../../Apps/Kitchen Sink/Kitchen Sink.tao')
    const stdLibRoot = resolvePath(__dirname, '../../../packages/tao-std-lib')
    const res = await TaoSDK_compile({ path, runtimeDir: resolvePath(__dirname, '../../expo-runtime/'), stdLibRoot })
    expect(res.result).toBeDefined()
  })
})

function getRandomUI() {
  const needle = Math.random().toString(36).substring(2, 15)
  const code = `
    file app KitchenSink { ui RootView }

    view RootView { Text value "${needle}" {} }

    view Text value string {
        inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
    }
  `
  return { code, needle }
}
