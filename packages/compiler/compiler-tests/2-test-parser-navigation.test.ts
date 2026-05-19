import { describe, parseAST, test } from './test-utils/test-harness'

describe('parse navigation:', () => {
  test('parses app navigation and stack destinations', async () => {
    const doc = await parseAST(`
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
        }
      }

      ui Home { }
      ui RoomScreen RoomId text { }
    `)

    doc.statements.first.as_AppDeclaration
      .appStatements.first.as_AppNavigationStatement
      .navigation.as_NavigatorDeclaration.expect('name')
      .toBe('MainNavigation')

    const stack = doc.statements.second.as_NavigatorDeclaration.body.as_StackNavigator
    stack.destinations.first.expect('name').toBe('Home')
    stack.destinations.first.expect('target').toBeUndefined()

    const room = stack.destinations[1]!
    room.expect('name').toBe('Room')
    room.expect('target').toBe('RoomScreen')
    void room.options.options[0]!.as_NavigationTitleOption.value
    void room.options.options[1]!.as_NavigationPathOption.value
    room.options.options[2]!.as_NavigationParamDeclaration.match({
      name: 'RoomId',
      type: 'text',
    })
  })

  test('parses tab destinations with system icons', async () => {
    const doc = await parseAST(`
      navigator MainTabs {
        tabs {
          tab Home
          tab Search SearchView {
            title "Search"
            icon system search
            path "/search/:Query"
            param Query text
          }
        }
      }

      ui Home { }
      ui SearchView Query text { }
    `)

    const tabs = doc.statements.first.as_NavigatorDeclaration.body.as_TabsNavigator
    tabs.destinations.first.expect('name').toBe('Home')
    tabs.destinations.first.expect('target').toBeUndefined()

    const search = tabs.destinations[1]!
    search.expect('name').toBe('Search')
    search.expect('target').toBe('SearchView')
    search.options.options[1]!.as_NavigationIconOption.match({
      source: 'system',
      name: 'search',
    })
  })

  test('parses navigation actions', async () => {
    const doc = await parseAST(`
      action OpenRoom RoomId text {
        navigation push Room {
          RoomId RoomId
        }
        navigation pop
        navigation tab Search
      }
    `)

    const statements = doc.statements.first.as_ActionDeclaration.block.statements
    const push = statements[0]!.as_NavigationPushAction
    push.expect('action').toBe('push')
    push.expect('target').toBe('Room')
    const assignment = push.payload.assignments.first
    assignment.expect('name').toBe('RoomId')
    void assignment.value.as_MemberAccessExpression

    statements[1]!.as_NavigationPopAction.expect('action').toBe('pop')
    statements[2]!.as_NavigationTabAction.match({
      action: 'tab',
      target: 'Search',
    })
  })
})
