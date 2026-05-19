import { compileTaoSource } from '@compiler/compiler-main'
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
    expect(emitted).toContain('RoomId={TR.Literal(_routeParams.RoomId)}')
    expect(emitted).toContain('linking: { path: "/rooms/:RoomId" }')
    expect(emitted).toContain('tabBarIcon: _taoNavigationTabIcon("search")')
    expect(emitted).toContain('const TaoAppNavigationRoot = createStaticNavigation(_TaoNavigator_MainNavigation)')
    expect(emitted).toContain('return <TaoAppNavigationRoot ref={_taoNavigationRootRef} />')
    expect(bootstrap).toContain('import { AppNavigationRoot }')
    expect(bootstrap).toContain('<AppNavigationRoot />')
    expect(bootstrap).not.toContain('<AppUIView />')
  })

  test('lowers navigation actions to runtime helper calls', async () => {
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
          screen SearchTabs
        }
      }

      navigator SearchTabs {
        tabs {
          tab Search SearchView {
            param Query text
          }
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }

      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }

      ui SearchView Query text {
        render inject \`\`\`ts return null \`\`\`
      }

      action OpenRoom RoomId text {
        navigation push Room {
          RoomId RoomId
        }
        navigation pop
        navigation tab Search {
          Query "recent"
        }
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
    expect(emitted).toContain('_taoNavigationRuntime.tab("Search", {')
    expect(emitted).toContain('"Query": TR.Literal("recent").evaluate().jsValue,')
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
    expect(bootstrap).toContain('<AppUIView />')
  })
})
