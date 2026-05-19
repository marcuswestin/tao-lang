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

    expect(emitted).toContain("import { createStaticNavigation } from '@react-navigation/native'")
    expect(emitted).toContain("import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'")
    expect(emitted).toContain("import { createNativeStackNavigator } from '@react-navigation/native-stack'")
    expect(emitted).toContain("import Ionicons from '@expo/vector-icons/Ionicons'")
    expect(emitted).toContain('const _TaoNavigator_SearchTabs = createBottomTabNavigator({')
    expect(emitted).toContain('const _TaoNavigator_MainNavigation = createNativeStackNavigator({')
    expect(emitted).toContain('RoomId={TR.Literal(_routeParams.RoomId)}')
    expect(emitted).toContain('linking: { path: "/rooms/:RoomId" }')
    expect(emitted).toContain('tabBarIcon: _taoNavigationTabIcon("search")')
    expect(emitted).toContain('const _AppNavigationRoot = createStaticNavigation(_TaoNavigator_MainNavigation)')
    expect(bootstrap).toContain('import { AppNavigationRoot }')
    expect(bootstrap).toContain('<AppNavigationRoot />')
    expect(bootstrap).not.toContain('<AppUIView />')
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
