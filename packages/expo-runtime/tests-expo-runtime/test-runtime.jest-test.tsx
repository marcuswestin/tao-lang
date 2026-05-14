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
import { Layout } from '../../tao-std-lib/tao/tao-runtime/Layout'
import { TR } from '../../tao-std-lib/tao/tao-runtime/tao-runtime'

const rowLayoutStyle = { gap: 8, justifyContent: 'space-between' } as const
const labelLayoutStyle = { alignSelf: 'center', width: 120 } as const
const buttonLayoutStyle = { alignSelf: 'center', width: 180 } as const

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <RN.Text>Hello Mock Test View</RN.Text>
    const res = await render(<MockTestView />).findByText('Hello Mock Test View')
    expect(res).toBeDefined()
  })

  test('maps Tao layout specs to React Native style props', () => {
    expect(Layout.resolve({ view: 'Row', entries: [['top', 'spread'], ['gap', 8]] })).toMatchObject({
      alignItems: 'flex-start',
      gap: 8,
      justifyContent: 'space-between',
    })

    expect(Layout.resolve({ view: 'Text', entries: [['centered'], ['width', 120]] })).toMatchObject({
      alignSelf: 'center',
      width: 120,
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
    const wrapper = singleJsonRoot(screen.toJSON())
    const nativeButton = screen.UNSAFE_getByType(RN.Button)

    expect(flattenStyle(wrapper.props.style)).toMatchObject({
      alignSelf: 'center',
      width: 180,
    })
    expect(nativeButton.props.title).toBe('Save')

    fireEvent.press(nativeButton)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test('compile and run with sdk', async () => {
    const { needle, runtimeDir, taoPath } = makeNeedleApp()
    const repoRoot = FS.resolvePath(runtimeDir, '../..')
    const taoSdkModuleUrl = FS.pathToFileURL(FS.resolvePath(runtimeDir, '_gen-tao-lib/tao-cli-main.js')).href
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

/** assertBootstrapRendersNeedle reloads the compiled app module tree (nested emits under the same dir need a full reset; matches pre-refactor tests). */
async function assertBootstrapRendersNeedle(needle: string, bootstrapPath: string) {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: CompiledNeedleApp } = require(bootstrapPath) as { default: ComponentType }
  await render(<CompiledNeedleApp />).findByText(needle)
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

    view RootView {
      alias TextValue = "${needle}"
      Text TextValue
    }

    view Text Value text {
        inject \`\`\`ts
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

function singleJsonRoot(tree: ReturnType<ReturnType<typeof render>['toJSON']>) {
  expect(tree).not.toBeNull()
  expect(Array.isArray(tree)).toBe(false)
  return tree as Exclude<typeof tree, null | readonly unknown[]>
}

async function _cmd(cmd: string, args: string[], opts?: { cwd: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['inherit', 'inherit', 'inherit'], cwd: opts?.cwd })
    p.on('exit', code => (code === 0 ? resolve(code) : reject(code)))
  })
}
