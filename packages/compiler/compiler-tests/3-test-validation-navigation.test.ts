import { validationMessages } from '@compiler/validation/tao-lang-validator'
import { expectHasHumanErrors, expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, parseASTWithErrors, parseMultipleFiles, parseTaoFully, test } from './test-utils/test-harness'

describe('navigation validation:', () => {
  test('valid stack navigation validates', async () => {
    await parseTaoFully(`
      app Rooms {
        navigation MainNavigation
      }

      navigator MainNavigation {
        stack {
          screen Home
          screen Room RoomScreen {
            path "/rooms/:RoomId"
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
    `)
  })

  test('valid tab navigation validates', async () => {
    await parseTaoFully(`
      app Tabs {
        navigation MainNavigation
      }

      navigator MainNavigation {
        tabs {
          tab Home {
            title "Home"
            icon system house
          }

          tab Settings SettingsView {
            title "Settings"
            icon system settings
            param Section text
          }
        }
      }

      ui Home {
        render inject \`\`\`ts return null \`\`\`
      }

      ui SettingsView Section text {
        render inject \`\`\`ts return null \`\`\`
      }

      action SelectSettings Section text {
        navigation tab Settings {
          Section Section
        }
      }
    `)
  })

  test('navigation action validates under a module-wrapped app declaration', async () => {
    await parseTaoFully(`
      share app Tabs {
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

      action Back {
        navigation pop
      }
    `)
  })

  test('app requires exactly one ui or navigation root', async () => {
    const missing = await parseASTWithErrors(`
      app Empty { }
    `)
    expectHumanMessagesContain(missing, validationMessages.appRootRequired)

    const mixed = await parseASTWithErrors(`
      app Mixed {
        ui Home
        navigation MainNavigation
      }
      navigator MainNavigation { stack { screen Home } }
      ui Home { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(mixed, validationMessages.appRootExclusive)
  })

  test('app navigation must reference a navigator', async () => {
    const report = await parseASTWithErrors(`
      app Bad {
        navigation Home
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(report, validationMessages.appNavigationMustReferenceNavigator)
  })

  test('app navigation rejects imported navigators in v1', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/app/main.tao',
        code: `
          use MainNavigation from ./nav
          app Bad {
            navigation MainNavigation
          }
        `,
      },
      {
        path: '/app/nav.tao',
        code: `
          share navigator MainNavigation {
            stack {
              screen Home
            }
          }
          ui Home { render inject \`\`\`ts return null \`\`\` }
        `,
      },
    ])
    expectHumanMessagesContain(result.getErrors(), validationMessages.appNavigationMustReferenceLocalNavigator)
  })

  test('navigator destinations validate names and targets', async () => {
    const duplicate = await parseASTWithErrors(`
      navigator MainNavigation {
        stack {
          screen Home
          screen Home
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(duplicate, validationMessages.duplicateNavigatorDestination('Home'))

    const missingTarget = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Missing
        }
      }
    `)
    expectHumanMessagesContain(missingTarget, "Navigation destination 'Missing' targets missing declaration 'Missing'.")

    const invalidTarget = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Bad TargetAction
        }
      }
      action TargetAction { }
    `)
    expectHumanMessagesContain(invalidTarget, "Navigation destination 'Bad' must target")
  })

  test('destination options validate placement and path params', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            icon system search
            path "/rooms/:RoomId/:Missing"
            param RoomId text
            param Extra number
          }
        }
      }
      ui RoomScreen RoomId text, Extra number {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(
      report,
      validationMessages.navigationIconStackOnly,
      validationMessages.navigationPathMissingParam('Missing'),
      validationMessages.navigationParamMissingFromPath('Extra'),
    )
  })

  test('destination options reject duplicate singleton options and params', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        tabs {
          tab Room RoomScreen {
            title "Room"
            title "Duplicate"
            icon system home
            icon system search
            path "/rooms/:RoomId"
            path "/duplicate/:RoomId"
            param RoomId text
            param RoomId text
          }
        }
      }
      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(
      report,
      validationMessages.duplicateNavigationTitle,
      validationMessages.duplicateNavigationIcon,
      validationMessages.duplicateNavigationPath,
      validationMessages.duplicateNavigationDestinationParam('RoomId'),
    )
  })

  test('destination params must match target view params', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            param Extra text
            param Count number
          }
        }
      }
      ui RoomScreen RoomId text, Count text {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(
      report,
      validationMessages.navigationParamMissingFromTarget('Extra', 'RoomScreen'),
      validationMessages.navigationTargetMissingParam('RoomId', 'RoomScreen'),
      validationMessages.navigationParamTypeMismatch('Count', 'text', 'number'),
    )
  })

  test('destination params reject non-navigation target param types', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            param OnSelect text
          }
        }
      }
      ui RoomScreen OnSelect action {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expectHumanMessagesContain(
      report,
      validationMessages.navigationParamUnsupportedTargetType('OnSelect', 'RoomScreen'),
    )
  })

  test('invalid navigation param type is rejected by parsing', async () => {
    const report = await parseASTWithErrors(`
      navigator MainNavigation {
        stack {
          screen Home {
            param Bad action
          }
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHasHumanErrors(report)
  })

  test('navigation actions validate targets and payload params', async () => {
    const wrongTargets = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        tabs {
          tab Search
        }
      }
      ui Search { render inject \`\`\`ts return null \`\`\` }
      action Go {
        navigation push Search
        navigation tab Missing
      }
    `)
    expectHumanMessagesContain(
      wrongTargets,
      validationMessages.navigationPushTargetMustBeStack('Search'),
      validationMessages.navigationActionUnknownTarget('Missing'),
    )

    const payload = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            param RoomId text
            param Count number
          }
        }
      }
      ui RoomScreen RoomId text, Count number {
        render inject \`\`\`ts return null \`\`\`
      }
      action Go RoomId text {
        navigation push Room {
          RoomId RoomId
          Count "wrong"
          Extra "x"
          Extra "again"
        }
      }
    `)
    expectHumanMessagesContain(
      payload,
      validationMessages.duplicateNavigationActionParam('Extra'),
      validationMessages.navigationActionExtraParam('Extra', 'Room'),
      validationMessages.navigationActionParamTypeMismatch('Count', 'number', 'text'),
    )

    const tabPayload = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        tabs {
          tab Search SearchView {
            param Query text
          }
        }
      }
      ui SearchView Query text {
        render inject \`\`\`ts return null \`\`\`
      }
      action Go {
        navigation tab Search {
          Query 2
          Extra "x"
        }
      }
    `)
    expectHumanMessagesContain(
      tabPayload,
      validationMessages.navigationActionExtraParam('Extra', 'Search'),
      validationMessages.navigationActionParamTypeMismatch('Query', 'text', 'number'),
    )

    const shorthand = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            param RoomId text
          }
        }
      }
      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }
      action Go OtherId text {
        navigation push Room {
          RoomId
        }
      }
    `)
    expectHumanMessagesContain(
      shorthand,
      validationMessages.navigationActionShorthandParamUnknown('RoomId'),
    )

    const unsupportedPayload = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Room RoomScreen {
            param RoomId text
          }
        }
      }
      ui RoomScreen RoomId text {
        render inject \`\`\`ts return null \`\`\`
      }
      action Go OnSelect action {
        navigation push Room {
          RoomId OnSelect
        }
      }
    `)
    expectHumanMessagesContain(
      unsupportedPayload,
      validationMessages.navigationActionParamUnsupportedExpression('RoomId'),
    )
  })

  test('navigation actions reject nested destination targets in v1', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Home
          screen SearchTabs
        }
      }
      navigator SearchTabs {
        tabs {
          tab Search
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
      ui Search { render inject \`\`\`ts return null \`\`\` }
      action Go {
        navigation tab Search
      }
    `)
    expectHumanMessagesContain(report, validationMessages.navigationActionTargetMustBeRootDestination('Search'))
  })

  test('navigation pop in tabs-only app emits diagnostic', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        tabs {
          tab Home
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
      action Go {
        navigation pop
      }
    `)
    expectHumanMessagesContain(report, validationMessages.navigationPopRequiresStack)
  })

  test('navigation actions require app navigation', async () => {
    const report = await parseASTWithErrors(`
      action Go {
        navigation push Home
      }
    `)
    expectHumanMessagesContain(report, validationMessages.navigationActionNeedsAppNavigation)
  })

  test('top-level navigation actions are rejected by statement placement validation', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Home
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
      navigation pop
    `)
    expectHumanMessagesContain(report, validationMessages.topLevel)
  })

  test('ambiguous navigation action target is rejected', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen Home
          screen Child ChildTabs
        }
      }
      navigator ChildTabs {
        tabs {
          tab Home
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
      action Go {
        navigation push Home
      }
    `)
    expectHumanMessagesContain(report, validationMessages.navigationActionAmbiguousTarget('Home'))
  })

  test('same child navigator cannot be targeted by multiple destinations', async () => {
    const report = await parseASTWithErrors(`
      app Bad { navigation MainNavigation }
      navigator MainNavigation {
        stack {
          screen First ChildNavigation
          screen Second ChildNavigation
        }
      }
      navigator ChildNavigation {
        stack {
          screen Home
        }
      }
      ui Home { render inject \`\`\`ts return null \`\`\` }
    `)
    expectHumanMessagesContain(
      report,
      "Navigator 'ChildNavigation' can only be targeted by one navigation destination.",
    )
  })
})
