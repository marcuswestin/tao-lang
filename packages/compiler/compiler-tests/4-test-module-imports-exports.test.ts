import { describe, expect, parseAST, parseMultipleFiles, test } from './test-utils/test-harness'

describe('use statement parsing', () => {
  test.todo('parses use statement with single import', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView'])
  })

  test.todo('parses use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView, AnotherView, ThirdView
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView', 'AnotherView', 'ThirdView'])
  })

  test.todo('parses use statement with parent path', async () => {
    const doc = await parseAST(`
      use ../shared/components Button
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('../shared/components')
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test.todo('parses multiple use statements', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      use ./ui/components Button, Input
      view MyView { }
    `)
    expect(doc.useStatements.length).toBe(2)
    expect(doc.useStatements[0].modulePath).toBe('./ui/views')
    expect(doc.useStatements[1].modulePath).toBe('./ui/components')
  })

  test.todo('use statements come before declarations', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      view MyView { }
      app MyApp { ui MyView }
    `)
    expect(doc.useStatements.length).toBe(1)
    expect(doc.topLevelStatements.length).toBe(2)
  })
})

describe('multi-file module parsing', () => {
  test.todo('parses files with use imports referencing other files', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `share view PublicView { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/views PublicView
          app MyApp { ui MainView }
          view MainView { }
        `,
      },
    ])
    const appFile = result.getFile('/project/app.tao')
    expect(appFile.useStatements.first.importedNames).toEqual(['PublicView'])
  })
})
