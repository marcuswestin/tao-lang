import { describe, expect, parseASTWithErrors, resolveReferences, test } from './test-utils/test-harness'

describe('alias validation', () => {
  test('error on duplicate alias names in the same scope', async () => {
    const errors = await parseASTWithErrors(`
      view MyView {
        alias X = 1
        alias X = 2
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain("Duplicate identifier 'X'")
  })

  test('no error for same alias name in different scopes', async () => {
    const doc = await resolveReferences(`
      view Container { }
      view MyView {
        alias X = 1
        Container {
          alias X = 2
        }
      }
    `)
    expect(doc).toBeDefined()
  })

  test('error on unresolved identifier reference', async () => {
    const errors = await parseASTWithErrors(`
      view Text Label text { }
      view MyView {
        Text Unknown
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain('Could not resolve reference')
  })

  test('warning when alias shadows a view parameter', async () => {
    const errors = await parseASTWithErrors(`
      view MyView Label text {
        alias Label = "shadowed"
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain("Duplicate identifier 'Label'")
  })
})
