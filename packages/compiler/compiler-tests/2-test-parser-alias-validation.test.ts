import { expectDuplicateIdentifier, expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, parseASTWithErrors, resolveReferences, test } from './test-utils/test-harness'

describe('alias validation', () => {
  test('error on duplicate alias names in the same scope', async () => {
    const errors = await parseASTWithErrors(`
      view MyView {
        alias X = 1
        alias X = 2
      }
    `)
    expectDuplicateIdentifier(errors, 'X')
  })

  test('no error for same alias name in different scopes', async () => {
    await resolveReferences(`
      view Container { }
      view MyView {
        alias X = 1
        Container {
          alias X = 2
        }
      }
    `)
  })

  test('error on unresolved identifier reference', async () => {
    const errors = await parseASTWithErrors(`
      view Text Label text { }
      view MyView {
        Text Unknown
      }
    `)
    expectHumanMessagesContain(errors, 'Could not resolve reference')
  })

  test('warning when alias shadows a view parameter', async () => {
    const errors = await parseASTWithErrors(`
      view MyView Label text {
        alias Label = "shadowed"
      }
    `)
    expectDuplicateIdentifier(errors, 'Label')
  })
})
