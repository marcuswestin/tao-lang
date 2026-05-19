import { compileTao, compileTaoSource } from '@compiler/compiler-main'
import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'
import { formatParseErrorHumanMessages } from './test-utils/diagnostics'

async function compileNavigationSource(source: string) {
  const result = await compileTaoSource({ source })
  if (!result.ok) {
    throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
  }
  return result
}

describe('codegen — navigation:', () => {
  test('emits Metro-safe module paths for navigation apps with spaces in source filenames', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-navigation-path-'))
    try {
      const appPath = FS.joinPath(tmpDir, 'Navigation Dev.tao')
      FS.writeFile(
        appPath,
        `
          app NavigationDev {
            navigation MainNavigation
          }

          navigator MainNavigation {
            stack {
              screen Home
            }
          }

          ui Home {
            render inject \`\`\`ts return null \`\`\`
          }
        `,
      )

      const result = await compileTao({ file: appPath })
      if (!result.ok) {
        throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
      }

      const bootstrap = result.files.find(file => file.relativePath === 'app-bootstrap.tsx')?.content ?? ''

      expect(result.files.some(file => file.relativePath === 'app/Navigation%20Dev.tsx')).toBe(true)
      expect(bootstrap).toContain("from './app/Navigation%20Dev'")
      expect(bootstrap).not.toContain("from './app/Navigation Dev'")
    } finally {
      FS.rmDirectory(tmpDir)
    }
  })

  test('emits React Navigation static config for stacks, tabs, params, and linking', async () => {
    const result = await compileNavigationSource(`
      app Rooms {
        navigation MainNavigation
      }

      navigator MainNavigation {
        stack {
          screen Home
          screen Room RoomScreen {
            title "Room"
            path "/rooms/:RoomId"
            param RoomId text
          }
          screen SearchTabs
        }
      }

      navigator SearchTabs {
        tabs {
          tab Search {
            title "Search"
            icon system search
          }
          tab Settings SettingsView
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }

      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }

      ui Search {
        render inject \`\`\`ts return null \`\`\`
      }

      ui SettingsView {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')
    const bootstrap = result.files.find(file => file.relativePath === 'app-bootstrap.tsx')?.content ?? ''

    expect(emitted).toContain(
      "import { createNavigationContainerRef, createStaticNavigation } from '@react-navigation/native'",
    )
    expect(emitted).toContain("import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'")
    expect(emitted).toContain("import { createNativeStackNavigator } from '@react-navigation/native-stack'")
    expect(emitted).toContain("import Ionicons from '@expo/vector-icons/Ionicons'")
    expect(emitted).toContain('const _taoNavigationRootRef = createNavigationContainerRef()')
    expect(emitted).not.toContain('StackActions')
    expect(emitted).not.toContain('createTaoNavigationRuntime')
    expect(emitted).toContain('const _TaoNavigator_SearchTabs = createBottomTabNavigator({')
    expect(emitted).toContain('const _TaoNavigator_MainNavigation = createNativeStackNavigator({')
    expect(emitted).toContain(
      'RoomId={TR.Literal(_taoNavigationRouteParam(_routeParams.RoomId, "text", "RoomId"))}',
    )
    expect(emitted).toContain('linking: { path: "/rooms/:RoomId" }')
    expect(emitted).toContain('tabBarIcon: _taoNavigationTabIcon("search")')
    expect(emitted).toContain('const TaoAppNavigationRoot = createStaticNavigation(_TaoNavigator_MainNavigation)')
    expect(emitted).toContain('export function AppNavigationRoot(props: { onReady?: () => void })')
    expect(emitted).toContain(
      'return <TaoAppNavigationRoot ref={_taoNavigationRootRef} linking={{ enabled: true }} onReady={props?.onReady} />',
    )
    expect(bootstrap).toContain('import { AppNavigationRoot }')
    expect(bootstrap).toContain("import { SafeAreaProvider } from 'react-native-safe-area-context'")
    expect(bootstrap).toContain('<SafeAreaProvider>')
    expect(bootstrap).toContain('export default function CompiledTaoApp(props)')
    expect(bootstrap).toContain('<AppNavigationRoot onReady={props?.onRuntimeReady} />')
    expect(bootstrap).not.toContain('<AppUIView />')
  })

  test('lowers stack navigation actions and shorthand params to runtime helper calls', async () => {
    const result = await compileNavigationSource(`
      app Rooms {
        navigation MainNavigation
      }

      navigator MainNavigation {
        stack {
          screen Home
          screen Room RoomScreen {
            param RoomId text
          }
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }

      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }

      action OpenRoom RoomId text {
        navigation push Room {
          RoomId
        }
        navigation pop
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')

    expect(emitted).toContain(
      "import { createNavigationContainerRef, createStaticNavigation, StackActions, TabActions } from '@react-navigation/native'",
    )
    expect(emitted).toContain("import { createTaoNavigationRuntime } from '../use/@tao/tao-runtime/navigation-runtime'")
    expect(emitted).toContain('const _taoNavigationRuntime = createTaoNavigationRuntime(_taoNavigationRootRef, {')
    expect(emitted).toContain('stackPush: StackActions.push')
    expect(emitted).toContain('stackPop: StackActions.pop')
    expect(emitted).toContain('tabJumpTo: TabActions.jumpTo')
    expect(emitted).toContain('_taoNavigationRuntime.push("Room", {')
    expect(emitted).toContain('"RoomId": _Scope.RoomId.evaluate().jsValue,')
    expect(emitted).toContain('_taoNavigationRuntime.pop()')
  })

  test('lowers root tab navigation actions to runtime helper calls', async () => {
    const result = await compileNavigationSource(`
      app Tabs {
        navigation MainNavigation
      }

      navigator MainNavigation {
        tabs {
          tab Search SearchView
        }
      }

      ui SearchView {
        render inject \`\`\`ts return null \`\`\`
      }

      action OpenSearch {
        navigation tab Search
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')

    expect(emitted).toContain('_taoNavigationRuntime.tab("Search", {})')
  })

  test('coerces number and boolean route params before passing them to Tao views', async () => {
    const result = await compileNavigationSource(`
      app Rooms {
        navigation MainNavigation
      }

      navigator MainNavigation {
        stack {
          screen Home
          screen Room RoomScreen {
            path "/rooms/:Count/:Pinned"
            param Count number
            param Pinned boolean
          }
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }

      ui RoomScreen Count number, Pinned boolean {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')

    expect(emitted).toContain(
      "function _taoNavigationRouteParam(value: unknown, type: 'text' | 'number' | 'boolean', name: string)",
    )
    expect(emitted).toContain("throw new Error(`Invalid navigation param '${name}': expected ${type}.`)")
    expect(emitted).toContain('if (Number.isFinite(decoded))')
    expect(emitted).toContain(
      'Count={TR.Literal(_taoNavigationRouteParam(_routeParams.Count, "number", "Count"))}',
    )
    expect(emitted).toContain(
      'Pinned={TR.Literal(_taoNavigationRouteParam(_routeParams.Pinned, "boolean", "Pinned"))}',
    )
  })

  test('keeps legacy ui-root bootstrap output unchanged', async () => {
    const result = await compileNavigationSource(`
      app Legacy {
        ui Home
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')
    const bootstrap = result.files.find(file => file.relativePath === 'app-bootstrap.tsx')?.content ?? ''

    expect(emitted).not.toContain('@react-navigation/native')
    expect(bootstrap).toContain('import { AppUIView }')
    expect(bootstrap).not.toContain('SafeAreaProvider')
    expect(bootstrap).toContain('<AppUIView />')
  })

  test('module-wrapped navigator declarations do not emit broken standalone exports', async () => {
    const result = await compileNavigationSource(`
      app Rooms {
        navigation MainNavigation
      }

      share navigator MainNavigation {
        stack {
          screen Home
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const emitted = result.files.map(file => file.content).join('\n')

    expect(emitted).toContain('const _TaoNavigator_MainNavigation = createNativeStackNavigator({')
    expect(emitted).not.toContain('\nexport \n')
  })
})
