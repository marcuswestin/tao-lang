import { describe, expect, parseAST, parseASTWithErrors, parseMultipleFiles, test } from './test-utils/test-harness'

describe('use statement parsing', () => {
  test('parses use statement with single import', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView'])
  })

  test('parses use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView, AnotherView, ThirdView
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView', 'AnotherView', 'ThirdView'])
  })

  test('parses use statement with parent path', async () => {
    const doc = await parseAST(`
      use ../shared/components Button
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('../shared/components')
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses multiple use statements', async () => {
    const doc = await parseAST(`
      use ./ui/views PublicView
      use ./ui/components Button, Input
      view MyView { }
    `)
    expect(doc.topLevelStatements.length).toBe(3)
    expect(doc.topLevelStatements[0].as_UseStatement.modulePath).toBe('./ui/views')
    expect(doc.topLevelStatements[1].as_UseStatement.modulePath).toBe('./ui/components')
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
    expect(appFile.topLevelStatements.first.as_UseStatement.importedNames).toEqual(['PublicView'])
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

  test('error when importing non-existent declaration', async () => {
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

  test('error when importing non-shared declaration from another module', async () => {
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

  test('error when importing file-private declaration', async () => {
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

  test('can import from subdirectory relative path', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/kitchen/counter/KnifeBlock.tao',
        code: `share view KnifeBlock { }`,
      },
      {
        path: '/project/kitchen/Kitchen Sink.tao',
        code: `
          use ./counter KnifeBlock
          view MainView {
            KnifeBlock { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/kitchen/Kitchen Sink.tao')
    expect(errors).toBeUndefined()
  })

  test('can import from subdirectory and use in view render', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app/components/counter/KnifeBlock.tao',
        code: `share view KnifeBlock { }`,
      },
      {
        path: '/project/app/Kitchen.tao',
        code: `
          use ./components/counter KnifeBlock
          view Text {
            KnifeBlock { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app/Kitchen.tao')
    expect(errors).toBeUndefined()
  })

  test('can import from nested subdirectory with multiple levels', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/src/ui/components/buttons/Button.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/src/app.tao',
        code: `
          use ./ui/components/buttons Button
          view MainView {
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/src/app.tao')
    expect(errors).toBeUndefined()
  })

  test('shared and file (default) declarations are accessible from within the same file', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app/Views.tao',
        code: `
          share view SharedView { }
          file view FileView { }
          view DefaultView { }
          view TestView {
            SharedView { }
            FileView { }
            DefaultView { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app/Views.tao')
    expect(errors).toBeUndefined()
  })

  test('can import from parent directory using ../', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/shared/components/Button.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/app/views/Login.tao',
        code: `
          use ../../shared/components Button
          view LoginView {
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app/views/Login.tao')
    expect(errors).toBeUndefined()
  })

  test('can import from parent directory using ".." only', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app/Fridge.tao',
        code: `share view FridgeView { }`,
      },
      {
        path: '/project/app/kitchen/Kitchen.tao',
        code: `
          use ../ FridgeView
          view KitchenView {
            FridgeView { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app/kitchen/Kitchen.tao')
    expect(errors).toBeUndefined()
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
})

describe('module system edge cases', () => {
  test('error when importing from non-existent module path', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `
          use ./non/existent/path Button
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('Cannot resolve module path')
  })

  test('multiple files with same declaration name in same module', async () => {
    // Both files have 'Button' declaration - both should be visible in same module
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `view Button { }`,
      },
      {
        path: '/project/ui/special-buttons.tao',
        code: `view Button { }`, // Same name, different file
      },
      {
        path: '/project/ui/forms.tao',
        code: `
          view Form {
            Button
          }
        `,
      },
    ])
    // Should work - Button is resolved (first match wins or last match, depends on impl)
    const errors = result.getErrors('/project/ui/forms.tao')
    expect(errors).toBeUndefined()
  })

  test('local declaration shadows imported declaration', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/buttons Button
          view Button { }
          view MainView {
            Button
          }
        `,
      },
    ])
    // Should work - local Button shadows imported Button
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeUndefined()
  })

  test('import multiple declarations from same module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/components.tao',
        code: `
          share view Button { }
          share view Input { }
          share view Label { }
        `,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/components Button, Input, Label
          view Form {
            Label { }
            Input { }
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeUndefined()
  })

  test('error when trying to import default (non-share) declaration from another module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/internal.tao',
        code: `view InternalHelper { }`, // No 'share' modifier
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/internal InternalHelper
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeDefined()
    expect(errors!.humanErrorMessage).toContain('InternalHelper')
  })

  test('mixed visibility in same file - share and file declarations', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/mixed.tao',
        code: `
          share view PublicButton { }
          file view PrivateHelper { }
          view ModuleOnlyView { }
        `,
      },
      {
        path: '/project/app.tao',
        code: `
          use ./ui/mixed PublicButton
          view MainView {
            PublicButton
          }
        `,
      },
    ])
    const errors = result.getErrors('/project/app.tao')
    expect(errors).toBeUndefined()
  })
})
