import { describe, expect, test } from 'bun:test'
import { TaoSDK_compile } from 'cli-src/tao-cli-main'

describe('cli:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('compile and run with cli', async () => {
    const { code, needle } = getRandomUI()
    const res = await TaoSDK_compile({ code, runtimeDir: __dirname + '/../../expo-runtime/' })
    expect(res.result).toBeDefined()
    expect(res.result?.code).toContain(needle)
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
