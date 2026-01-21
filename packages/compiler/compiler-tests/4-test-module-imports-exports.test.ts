import { describe, expect, parseAST, parseASTWithErrors, parseMultipleFiles, test } from './test-utils/test-harness'

describe('use statement parsing', () => {
  test('parses use statement with single import', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView'])
  })

  test('parses use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView, AnotherView, ThirdView
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView', 'AnotherView', 'ThirdView'])
  })

  test('parses use statement with parent path', async () => {
    const doc = await parseAST(`
      use ../shared/components Button
      view MyView { }
    `)
    const useStmt = doc.useStatements.first
    expect(useStmt.modulePath).toBe('../shared/components')
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses multiple use statements', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      use ./ui/components Button, Input
      view MyView { }
    `)
    expect(doc.useStatements.length).toBe(2)
    expect(doc.useStatements[0].modulePath).toBe('./ui/views')
    expect(doc.useStatements[1].modulePath).toBe('./ui/components')
  })

  test('use statements come before declarations', async () => {
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
  test('parses files with use imports referencing other files', async () => {
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

describe('cross-module import resolution (use statement)', () => {
  test('imported shared view can be referenced', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/views Button
          view MainView {
            Button
          }
        `,
      },
    ])
    // Should have no errors - Button is resolved from the import
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeUndefined()
  })

  // TODO: These tests require a UseStatement validator with index manager access
  // For now, only references to imported symbols are validated (via scope provider)
  test.todo('error when importing non-existent declaration', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/views NonExistent
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('NonExistent')
  })

  test.todo('error when importing non-shared declaration from another module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `view InternalView { }`, // Not shared - only visible within ui/ module
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/views InternalView
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('InternalView')
  })

  test.todo('error when importing file-private declaration', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `file view PrivateView { }`, // Explicitly private to file
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/views PrivateView
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('PrivateView')
  })

  test('can import from multiple files in same module folder', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/ui/inputs.tao',
        code: `share view TextInput { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui Button, TextInput
          view MainView {
            Button { TextInput }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeUndefined()
  })
})

describe('same-module visibility (no use statement needed)', () => {
  test('default declarations are visible to other files in same module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `view Button { }`, // Default visibility - visible within module
      },
      {
        path: '/project/ui/forms.tao',
        code: `
          view LoginForm {
            Button
          }
        `,
      },
    ])
    // No use statement needed - Button is in same module
    const errors = result.getErrors('/project/ui/forms.tao')
    expect(errors).toBeUndefined()
  })

  test('shared declarations are also visible within same module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/ui/forms.tao',
        code: `
          view LoginForm {
            Button
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/ui/forms.tao')
    expect(errors).toBeUndefined()
  })

  test('file-private declarations are NOT visible to other files in same module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `file view PrivateHelper { }`, // File-private
      },
      {
        path: '/project/ui/forms.tao',
        code: `
          view LoginForm {
            PrivateHelper
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/ui/forms.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('PrivateHelper')
  })

  test(`imports don't crash the compiler`, async () => {
    // Invalid path (missing ./ prefix) - should return errors, not crash
    const errors = await parseASTWithErrors(`use app/ui`)
    expect(errors).toBeDefined() // Parse error expected, but no crash
  })
})
