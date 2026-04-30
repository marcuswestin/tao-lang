import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'
import { TaoSDK_compile } from '../cli-src/tao-cli-main'

const stdLibRoot = FS.resolvePath(__dirname, '../../../packages/tao-std-lib')
const runtimeDir = FS.resolvePath(__dirname, '../../expo-runtime/')

async function compileFile(path: string) {
  return TaoSDK_compile({ path, runtimeDir, stdLibRoot })
}

describe('cli:', () => {
  test('compile real Test App with use statements from disk', async () => {
    const appPath = FS.resolvePath(
      __dirname,
      '../../../Apps/Test Apps/Local Param Types/Local Param Types.tao',
    )
    const res = await compileFile(appPath)
    expect(res.files.length).toBeGreaterThan(0)
  })

  test('compile Kitchen Sink (multi-folder use imports, all major features)', async () => {
    const appPath = FS.resolvePath(
      __dirname,
      '../../../Apps/Test Apps/Kitchen Sink/Kitchen Sink.tao',
    )
    const res = await compileFile(appPath)
    expect(res.files.length).toBeGreaterThan(0)
  })

  test('compile and run with cli', async () => {
    const { code, needle } = getRandomUI()
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-test-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      FS.writeFile(appPath, code)
      const res = await compileFile(appPath)
      expect(res.files.some(f => f.content.includes(needle))).toBe(true)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('compile honors outputFileName when target path has no _gen segment', async () => {
    const { code } = getRandomUI()
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-output-name-test-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      const testRuntimeDir = FS.joinPath(tmpDir, 'runtime')
      const outputFileName = 'app-build/output.tsx'
      FS.writeFile(appPath, code)
      FS.mkdir(testRuntimeDir)
      const result = await TaoSDK_compile({
        path: appPath,
        runtimeDir: testRuntimeDir,
        stdLibRoot,
        outputFileName,
      })
      const expectedPath = FS.resolvePath(testRuntimeDir, outputFileName)
      expect(result.outputPath).toBe(expectedPath)
      expect(FS.isFile(expectedPath)).toBe(true)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('compile writes error app to outputFileName before throwing', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-error-output-test-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      const testRuntimeDir = FS.joinPath(tmpDir, 'runtime')
      const outputFileName = 'app-build/output.tsx'
      const expectedPath = FS.resolvePath(testRuntimeDir, outputFileName)
      FS.writeFile(
        appPath,
        `
        app Broken { ui RootView }
        view RootView { Text 42 }
        view Text Value text { }
      `,
      )
      FS.mkdir(testRuntimeDir)

      let error: unknown
      try {
        await TaoSDK_compile({
          path: appPath,
          runtimeDir: testRuntimeDir,
          stdLibRoot,
          outputFileName,
        })
      } catch (err) {
        error = err
      }

      expect(error).toBeDefined()
      expect(FS.readTextFile(expectedPath)).toContain('Error compiling file')
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })
})

function getRandomUI() {
  const needle = Math.random().toString(36).substring(2, 15)
  const code = `
    app KitchenSink { ui RootView }

    view RootView { Text "${needle}" {} }

    view Text Value text {
        inject \`\`\`ts return <RN.Text>{_ViewProps.Value}</RN.Text> \`\`\`
    }
  `
  return { code, needle }
}
