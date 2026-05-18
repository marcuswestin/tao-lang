import { acceptTaoDesignSuggestions, generateTaoDesignSuggestions } from '@compiler'
import { createFixtureDesignSuggestionProvider } from '@compiler/design/design-suggestion-provider'
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
        ui RootView { render Text 42 }
        ui Text Value text { render inject \`\`\`ts return null \`\`\` }
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

  test('compile push-schema works with Memory admin no-op and does not leak admin token into emitted bootstrap', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-compile-schema-push-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      const testRuntimeDir = FS.joinPath(tmpDir, 'runtime')
      FS.writeFile(appPath, getDataApp('Memory'))
      FS.mkdir(testRuntimeDir)
      await TaoSDK_compile({
        path: appPath,
        runtimeDir: testRuntimeDir,
        stdLibRoot,
        outputFileName: 'app-build/output.tsx',
        app: { provider: { adminToken: 'compile-time-secret' } },
        pushSchema: true,
      })
      expect(FS.readTextFile(FS.joinPath(testRuntimeDir, 'app-build/output.tsx'))).not.toContain(
        'compile-time-secret',
      )
      expect(FS.isDirectory(FS.joinPath(testRuntimeDir, 'app-build/use/@tao/data/providers/in-memory/client'))).toBe(
        true,
      )
      expect(FS.existsSync(FS.joinPath(testRuntimeDir, 'app-build/use/@tao/data/providers/tao-query-projection.ts')))
        .toBe(
          true,
        )
      expect(FS.existsSync(FS.joinPath(testRuntimeDir, 'app-build/use/@tao/data/providers/in-memory/admin'))).toBe(
        false,
      )
      expect(FS.existsSync(FS.joinPath(testRuntimeDir, 'app-build/use/@tao/data/providers/instantdb/admin'))).toBe(
        false,
      )
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('design review and update honor a custom lock dir', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-design-lock-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      const lockDir = FS.joinPath(tmpDir, 'locks')
      const testRuntimeDir = FS.joinPath(tmpDir, 'runtime')
      FS.writeFile(appPath, getDesignApp())
      FS.mkdir(lockDir)
      FS.mkdir(testRuntimeDir)

      const review = await generateTaoDesignSuggestions({ file: appPath, stdLibRoot, designLockDir: lockDir })
      expect(review.suggestionPath).toBe(FS.joinPath(lockDir, '.tao.design.lock'))
      expect(FS.isFile(review.suggestionPath)).toBe(true)
      expect(review.diagnostics.some(d => d.kind === 'new-entry')).toBe(true)

      const accepted = await acceptTaoDesignSuggestions({ file: appPath, stdLibRoot, designLockDir: lockDir })
      expect(accepted.acceptedPath).toBe(FS.joinPath(lockDir, 'tao.design.lock'))
      expect(Object.values(accepted.lock.entries).every(entry => entry.status === 'accepted')).toBe(true)

      await TaoSDK_compile({
        path: appPath,
        runtimeDir: testRuntimeDir,
        stdLibRoot,
        designMode: 'production',
        designLockDir: lockDir,
      })
      expect(FS.isFile(FS.joinPath(testRuntimeDir, '_gen/tao-app/tao-design.ts'))).toBe(true)
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('design review accepts an injected hermetic suggestion provider', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-cli-design-provider-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'app.tao')
      FS.writeFile(appPath, getDesignApp())

      const review = await generateTaoDesignSuggestions({
        file: appPath,
        stdLibRoot,
        suggestionProvider: createFixtureDesignSuggestionProvider(),
      })

      expect(review.lock.analyzer.profile).toBe('fixture-provider')
      expect(FS.readTextFile(review.suggestionPath)).toContain('brand.primary')
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })
})

function getRandomUI() {
  const needle = Math.random().toString(36).substring(2, 15)
  const code = `
    app KitchenSink { ui RootView }

    ui RootView { render Text "${needle}" {} }

    ui Text Value text {
        render inject \`\`\`ts return <RN.Text>{_ViewProps.Value}</RN.Text> \`\`\`
    }
  `
  return { code, needle }
}

function getDataApp(provider: 'Memory' | 'InstantDB') {
  const providerBlock = provider === 'InstantDB'
    ? 'provider InstantDB { appId "00000000-0000-0000-0000-000000000001" }'
    : 'provider Memory { }'
  return `
    use Text from @tao/ui

    data HarnessData {
      Items Item {
        Name text,
        Ordering number indexed,
      }
    }

    app HarnessApp {
      ${providerBlock}
      ui HarnessRoot
    }

    ui HarnessRoot { render Text "Harness" }
  `
}

function getDesignApp() {
  return `
    use Text from @tao/ui

    app DesignApp {
      design { description "Quiet team dashboard" }
      ui Home
    }

    ui Home <"body copy"> {
      render Text "Hello"
    }
  `
}
