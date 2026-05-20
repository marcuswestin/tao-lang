import { describe, jest, test } from '@jest/globals'
import { FS } from '@shared'
import { spawn } from '@shared/exec'
import {
  runTaoSdkCompileBunSync,
  TAO_SDK_COMPILE_OPTS_ENV_EXPO,
  throwIfTaoSdkCompileFailed,
} from '@shared/testing'
import { fireEvent, render } from '@testing-library/react-native'
import type { ComponentType } from 'react'
import * as RN from 'react-native'
import { TaoAppShell } from '../../tao-std-lib/tao/tao-runtime/AppShell.native'
import { Layout } from '../../tao-std-lib/tao/tao-runtime/Layout'
import { TR } from '../../tao-std-lib/tao/tao-runtime/tao-runtime'

const rowLayoutStyle = { gap: 8, justifyContent: 'space-between' } as const
const labelLayoutStyle = { alignSelf: 'center', width: 120 } as const
const buttonLayoutStyle = { alignSelf: 'center', width: 180 } as const
const appShellContentStyle = { paddingHorizontal: 7, paddingTop: 5 } as const

type ExpoRuntimePackageJson = {
  readonly dependencies?: Record<string, string>
  readonly main?: string
}

type ExpoRuntimeAppJson = {
  readonly expo?: {
    readonly experiments?: Record<string, unknown>
    readonly plugins?: unknown[]
    readonly web?: {
      readonly output?: string
    }
  }
}

type SafeAreaContextTestMock = {
  setSafeAreaInsetsForTests(insets: { bottom: number; left: number; right: number; top: number }): void
}

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <RN.Text>Hello Mock Test View</RN.Text>
    const res = await render(<MockTestView />).findByText('Hello Mock Test View')
    expect(res).toBeDefined()
  })

  test('uses a direct Expo root entry', () => {
    const packageJsonPath = FS.resolvePath(__dirname, '../package.json')
    const packageJson = JSON.parse(FS.readTextFile(packageJsonPath)) as ExpoRuntimePackageJson
    const appJsonPath = FS.resolvePath(__dirname, '../app.json')
    const appJson = JSON.parse(FS.readTextFile(appJsonPath)) as ExpoRuntimeAppJson
    const entrySource = FS.readTextFile(FS.resolvePath(__dirname, '../index.ts'))
    const runtimeEntrypointSource = FS.readTextFile(FS.resolvePath(__dirname, '../runtime-entrypoint.ts'))

    expect(packageJson.main).toBe('index.ts')
    expect(packageJson.dependencies?.['expo-router']).toBeUndefined()
    expect(packageJson.dependencies?.['expo-splash-screen']).toBeDefined()
    expect(appJson.expo?.plugins).not.toContain('expo-router')
    expect(appJson.expo?.experiments?.['typedRoutes']).toBeUndefined()
    expect(appJson.expo?.web?.output).toBe('single')
    expect(entrySource).toContain('registerRootComponent(ExpoRuntimeEntrypoint)')
    expect(entrySource).not.toContain('expo-router')
    expect(runtimeEntrypointSource).toContain("import * as SplashScreen from 'expo-splash-screen'")
    expect(runtimeEntrypointSource).toContain("hideNativeSplash('navigation ready')")
    expect(runtimeEntrypointSource).toContain('RuntimeStartupErrorBoundary')
    expect(FS.existsSync(FS.resolvePath(__dirname, '../app/_layout.tsx'))).toBe(false)
    expect(FS.existsSync(FS.resolvePath(__dirname, '../app/index.tsx'))).toBe(false)
  })

  test('maps Tao layout specs to React Native style props', () => {
    expect(Layout.resolve({ view: 'Row', entries: [['items', 'top', 'spread'], ['gap', 8]] })).toMatchObject({
      alignItems: 'flex-start',
      gap: 8,
      justifyContent: 'space-between',
      overflow: 'hidden',
    })

    expect(
      Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['aligned', 'center'], ['width', 120]] }),
    ).toMatchObject({
      alignSelf: 'center',
      overflow: 'hidden',
      width: 120,
    })

    expect(Layout.resolve({ view: 'Col', entries: [] })).toMatchObject({
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'Stack', entries: [] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'Box', entries: [['items', 'center']] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'WrappingRow', entries: [] })).toMatchObject({
      alignItems: 'baseline',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    const wrappingRowDefaults = Layout.resolve({
      view: 'WrappingRow',
      parentDirection: 'column',
      entries: [['compress'], ['width', 'fill'], ['height', 'hug']],
    })
    expect(wrappingRowDefaults).toMatchObject({
      alignItems: 'baseline',
      alignSelf: 'stretch',
      flexShrink: 1,
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })
    expect(wrappingRowDefaults).not.toHaveProperty('flexGrow')

    expect(Layout.resolve({ view: 'Row', entries: [['pad', 10, 'horizontal', 4]] })).toMatchObject({
      paddingBottom: 10,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 10,
    })

    expect(Layout.resolve({ view: 'Text', entries: [['fill'], ['rigid']] })).toMatchObject({
      alignSelf: 'stretch',
      flexGrow: 1,
      flexShrink: 0,
      overflow: 'hidden',
    })

    expect(
      Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['width', 'fill', 'max', 400]] }),
    ).toMatchObject({
      flexGrow: 1,
      maxWidth: 400,
      overflow: 'hidden',
    })

    expect(
      Layout.resolveMerged({
        view: 'Box',
        entrySets: [
          [['pad', 8], ['rigid']],
          [['pad', 'horizontal', 4], ['compress']],
        ],
      }),
    ).toMatchObject({
      flexShrink: 1,
      paddingBottom: 8,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 8,
    })
  })

  test('ignores non-string pad tokens while merging layout padding entries', () => {
    expect(
      Layout.resolveMerged({
        view: 'Box',
        entrySets: [
          [['pad', 'top', 6]],
          [['pad', undefined as unknown as string, 'horizontal', 3]],
        ],
      }),
    ).toMatchObject({
      paddingBottom: 0,
      paddingLeft: 3,
      paddingRight: 3,
      paddingTop: 6,
    })
  })

  test('applies Tao layout styles through std-lib Row and Text views', () => {
    const screen = render(
      <TR.Views.Row testID="row" _taoLayout={rowLayoutStyle}>
        <TR.Views.Text testID="label" _taoLayout={labelLayoutStyle}>
          Label
        </TR.Views.Text>
      </TR.Views.Row>,
    )

    expect(flattenStyle(screen.getByTestId('row').props.style)).toMatchObject({
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'space-between',
    })
    expect(flattenStyle(screen.getByTestId('label').props.style)).toMatchObject({
      alignSelf: 'center',
      width: 120,
    })
  })

  test('applies safe-area insets to the native Tao app shell content frame', () => {
    const safeAreaMock = safeAreaContextTestMock()
    safeAreaMock.setSafeAreaInsetsForTests({ bottom: 20, left: 3, right: 4, top: 10 })

    try {
      const screen = render(
        <TaoAppShell
          backgroundColor="#f7f8fa"
          contentStyle={appShellContentStyle}
          kind="ui"
        >
          <RN.Text>Shell content</RN.Text>
        </TaoAppShell>,
      )
      const scrollView = screen.UNSAFE_getByType(RN.ScrollView)

      expect(flattenStyle(scrollView.props.style)).toMatchObject({
        backgroundColor: '#f7f8fa',
        flex: 1,
      })
      expect(flattenStyle(scrollView.props.contentContainerStyle)).toMatchObject({
        paddingBottom: 20,
        paddingLeft: 10,
        paddingRight: 11,
        paddingTop: 15,
      })
      expect(scrollView.props.bottomOffset).toBe(20)
      expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled')
    } finally {
      safeAreaMock.setSafeAreaInsetsForTests({ bottom: 0, left: 0, right: 0, top: 0 })
    }
  })

  test('does not add safe-area padding around native navigation shell content', () => {
    const safeAreaMock = safeAreaContextTestMock()
    safeAreaMock.setSafeAreaInsetsForTests({ bottom: 20, left: 3, right: 4, top: 10 })

    try {
      const screen = render(
        <TaoAppShell
          backgroundColor="#101820"
          contentStyle={appShellContentStyle}
          kind="navigation"
        >
          <RN.Text>Navigation shell content</RN.Text>
        </TaoAppShell>,
      )
      const rootView = screen.UNSAFE_getByType(RN.View)

      expect(() => screen.UNSAFE_getByType(RN.ScrollView)).toThrow(/No instances found/)
      expect(flattenStyle(rootView.props.style)).toMatchObject({
        backgroundColor: '#101820',
        flex: 1,
      })
      expect(screen.getByText('Navigation shell content')).toBeDefined()
    } finally {
      safeAreaMock.setSafeAreaInsetsForTests({ bottom: 0, left: 0, right: 0, top: 0 })
    }
  })

  test('applies standard container host styles through std-lib views', () => {
    const screen = render(
      <TR.Views.Col testID="col">
        <TR.Views.Stack testID="stack">
          <TR.Views.Box testID="box">
            <TR.Views.WrappingRow testID="wrapping-row">
              <TR.Views.Text>Chip</TR.Views.Text>
            </TR.Views.WrappingRow>
          </TR.Views.Box>
        </TR.Views.Stack>
      </TR.Views.Col>,
    )

    expect(flattenStyle(screen.getByTestId('col').props.style)).toMatchObject({
      flexDirection: 'column',
    })
    expect(flattenStyle(screen.getByTestId('stack').props.style)).toMatchObject({
      flexDirection: 'column',
    })
    expect(flattenStyle(screen.getByTestId('box').props.style)).toMatchObject({
      flexDirection: 'row',
    })
    expect(flattenStyle(screen.getByTestId('wrapping-row').props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
    })
  })

  test('applies Tao text pressure props through std-lib text variants', () => {
    const screen = render(
      <>
        <TR.Views.Text testID="text">Single line</TR.Views.Text>
        <TR.Views.TextLabel testID="text-label" _taoLayout={labelLayoutStyle}>Label</TR.Views.TextLabel>
        <TR.Views.MultiLineText testID="multi-line">Unlimited lines</TR.Views.MultiLineText>
        <TR.Views.MultiLineText testID="limited-multi-line" lines={3} _taoLayout={labelLayoutStyle}>
          Limited lines
        </TR.Views.MultiLineText>
        <TR.Views.Number testID="number">42</TR.Views.Number>
      </>,
    )

    expect(screen.getByTestId('text').props).toMatchObject({
      ellipsizeMode: 'tail',
      numberOfLines: 1,
    })
    expect(screen.getByTestId('text-label').props).toMatchObject({
      ellipsizeMode: 'clip',
      numberOfLines: 1,
    })
    expect(flattenStyle(screen.getByTestId('text-label').props.style)).toMatchObject(labelLayoutStyle)
    expect(screen.getByTestId('multi-line').props.numberOfLines).toBeUndefined()
    expect(screen.getByTestId('multi-line').props.ellipsizeMode).toBeUndefined()
    expect(screen.getByTestId('limited-multi-line').props).toMatchObject({
      ellipsizeMode: 'tail',
      numberOfLines: 3,
    })
    expect(flattenStyle(screen.getByTestId('limited-multi-line').props.style)).toMatchObject(labelLayoutStyle)
    expect(screen.getByTestId('number').props).toMatchObject({
      ellipsizeMode: 'tail',
      numberOfLines: 1,
    })
  })

  test('applies Tao layout styles to the std-lib Button wrapper', () => {
    const onPress = jest.fn()
    const screen = render(
      <TR.Views.Button
        title="Save"
        testID="save-button"
        onPress={onPress}
        _taoLayout={buttonLayoutStyle}
      />,
    )
    const button = screen.getByTestId('save-button')
    const label = screen.getByText('Save')
    const buttonStyle = typeof button.props.style === 'function'
      ? button.props.style({ pressed: false })
      : button.props.style

    expect(flattenStyle(buttonStyle)).toMatchObject({
      alignSelf: 'center',
      width: 180,
    })
    expect(button.props.accessibilityRole).toBe('button')
    expect(flattenStyle(label.props.style)).toMatchObject({
      fontWeight: '600',
    })

    fireEvent.press(button)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('compile and run with sdk', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    const repoRoot = FS.resolvePath(runtimeDir, '../..')
    const taoSdkModuleUrl = FS.pathToFileURL(
      FS.resolvePath(repoRoot, '.builds/expo-runtime/_gen-tao-lib/tao-cli-main.js'),
    ).href
    const outputPath = FS.resolvePath(runtimeDir, '_gen/tao-app/app-bootstrap.tsx')

    const command = runTaoSdkCompileBunSync({
      repoRoot,
      taoSdkModuleUrl,
      compileOpts: { path: taoPath, runtimeDir },
      optsEnvVar: TAO_SDK_COMPILE_OPTS_ENV_EXPO,
    })
    throwIfTaoSdkCompileFailed(command, { outputPath, runtimeLabel: 'the Expo runtime' })
    expect(emitTreeContainsNeedle(FS.dirname(outputPath), needle)).toBe(true)

    await assertBootstrapRendersNeedle(needle, outputPath)
    FS.rmDirectory(FS.dirname(taoPath), { recursive: true })
  })

  test('compile and run with cli', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    // `just tao` runs `_tao`, which does `pushd ../tao-cli`; cwd must be `packages/*` (not repo root).
    const exitCode = await _cmd('just', ['tao', 'compile', taoPath, '--runtime-dir', runtimeDir], {
      cwd: FS.joinPath(__dirname, '../../..', 'packages/expo-runtime'),
    })
    expect(exitCode).toBe(0)
    const bootstrapPath = FS.resolvePath(runtimeDir, `_gen/tao-app/app-bootstrap.tsx`)

    await assertBootstrapRendersNeedle(needle, bootstrapPath)
    FS.rmDirectory(FS.dirname(taoPath))
  })
})

/** assertBootstrapRendersNeedle reloads the compiled app module tree and its React renderer together. */
async function assertBootstrapRendersNeedle(needle: string, bootstrapPath: string) {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactRuntime = require('react') as typeof import('react')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TestRenderer = require('react-test-renderer') as {
    act(callback: () => void): void
    create(element: unknown): { toJSON(): unknown }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: CompiledNeedleApp } = require(bootstrapPath) as { default: ComponentType }
  let tree: { toJSON(): unknown } | undefined
  TestRenderer.act(() => {
    tree = TestRenderer.create(ReactRuntime.createElement(CompiledNeedleApp))
  })
  expect(testRendererTreeContainsText(tree?.toJSON(), needle)).toBe(true)
}

function testRendererTreeContainsText(node: unknown, text: string): boolean {
  if (typeof node === 'string') {
    return node === text
  }
  if (Array.isArray(node)) {
    return node.some(child => testRendererTreeContainsText(child, text))
  }
  if (node === null || typeof node !== 'object') {
    return false
  }
  const children = (node as { children?: unknown }).children
  return testRendererTreeContainsText(children, text)
}

/** emitTreeContainsNeedle returns true when some `.ts`/`.tsx` under `rootDir` contains `needle`. */
function emitTreeContainsNeedle(rootDir: string, needle: string): boolean {
  for (const ent of FS.readDirWithFileTypes(rootDir)) {
    const p = FS.joinPath(rootDir, ent.name)
    if (ent.isDirectory()) {
      if (emitTreeContainsNeedle(p, needle)) {
        return true
      }
    } else if ((ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) && FS.readTextFile(p).includes(needle)) {
      return true
    }
  }
  return false
}

function makeNeedleApp() {
  const needle = Math.random().toString(36).substring(2, 15)
  const runtimeDir = FS.resolvePath(__dirname, '..')
  const code = `
    app KitchenSink { ui RootView }

    ui RootView {
      alias TextValue = "${needle}"
      render Wrapper {
        Text TextValue
      }
    }

    frame Stack {
        render inject \`\`\`ts
          return TR.Views.Col(_ViewProps)
        \`\`\`
    }

    frame Wrapper {
      render Stack {
        @@children
      }
    }

    ui Text Value text {
        render inject \`\`\`ts
          return TR.Views.Text({ children: [_ViewProps.Value.evaluate().jsValue] })
        \`\`\`
    }
  `
  const dir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-expo-test-'))
  const taoPath = FS.joinPath(dir, 'NeedleApp.tao')
  FS.writeFile(taoPath, code)
  return { needle, runtimeDir, taoPath }
}

function flattenStyle(style: RN.StyleProp<any>) {
  return RN.StyleSheet.flatten(style)
}

function safeAreaContextTestMock(): SafeAreaContextTestMock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-safe-area-context') as SafeAreaContextTestMock
}

async function _cmd(cmd: string, args: string[], opts?: { cwd: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['inherit', 'inherit', 'inherit'], cwd: opts?.cwd })
    p.on('exit', code => (code === 0 ? resolve(code) : reject(code)))
  })
}
