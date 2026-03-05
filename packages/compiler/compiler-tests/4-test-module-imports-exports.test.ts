import { describe, expect, parseAST, parseASTWithErrors, parseMultipleFiles, test } from './test-utils/test-harness'

describe('use statement parsing', () => {
  test('parses use statement with single import', async () => {
    const doc = await parseAST(`
      use PublicView from ./ui/views
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView'])
  })

  test('parses use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use PublicView, AnotherView, ThirdView from ./ui/views
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView', 'AnotherView', 'ThirdView'])
  })

  test('parses use statement with parent path', async () => {
    const doc = await parseAST(`
      use Button from ../shared/components
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('../shared/components')
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses multiple use statements', async () => {
    const doc = await parseAST(`
      use PublicView from ./ui/views
      use Button, Input from ./ui/components
      view MyView { }
    `)
    expect(doc.topLevelStatements.length).toBe(3)
    expect(doc.topLevelStatements[0].as_UseStatement.modulePath).toBe('./ui/views')
    expect(doc.topLevelStatements[1].as_UseStatement.modulePath).toBe('./ui/components')
  })

  test('parses same-module use statement (no from clause)', async () => {
    const doc = await parseAST(`
      use Button
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    useStmt.expect('modulePath').toBeUndefined()
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses same-module use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use Button, Input, Label
      view MyView { }
    `)
    const useStmt = doc.topLevelStatements.first.as_UseStatement
    useStmt.expect('modulePath').toBeUndefined()
    expect(useStmt.importedNames).toEqual(['Button', 'Input', 'Label'])
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
          use PublicView from ./ui/views
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
          use Button from ./ui/views
          view MainView {
            Button
          }
        `,
      },
    ])
    // Should have no errors - Button is resolved from the import
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use NonExistent from ./ui/views
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('NonExistent')
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
          use InternalView from ./ui/views
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('InternalView')
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
          use PrivateView from ./ui/views
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('PrivateView')
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
          use Button, TextInput from ./ui
          view MainView {
            Button { TextInput }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use KnifeBlock from ./counter
          view MainView {
            KnifeBlock { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use KnifeBlock from ./components/counter
          view Text {
            KnifeBlock { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use Button from ./ui/components/buttons
          view MainView {
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use Button from ../../shared/components
          view LoginView {
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use FridgeView from ../
          view KitchenView {
            FridgeView { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  describe('same-module imports (use Foo)', () => {
    test('default declarations are accessible via use statement', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `view Button { }`,
        },
        {
          path: '/project/ui/forms.tao',
          code: `
          use Button
          view LoginForm {
            Button
          }
        `,
        },
      ])
      const errors = result.getErrors()
      expect(errors.errorCount()).toBe(0)
    })

    test('shared declarations are accessible via use statement', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `share view Button { }`,
        },
        {
          path: '/project/ui/forms.tao',
          code: `
          use Button
          view LoginForm {
            Button
          }
        `,
        },
      ])
      const errors = result.getErrors()
      expect(errors.errorCount()).toBe(0)
    })

    test('same-module symbols are NOT accessible without use statement', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `view Button { }`,
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
      const errors = result.getErrors()
      expect(errors.errorCount()).toBe(1)
      expect(errors.getHumanErrorMessage()).toContain('Button')
    })

    test('file-private declarations are NOT accessible via use statement', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `file view PrivateHelper { }`,
        },
        {
          path: '/project/ui/forms.tao',
          code: `
          use PrivateHelper
          view LoginForm {
            PrivateHelper
          }
        `,
        },
      ])
      const errors = result.getErrors()
      expect(errors.errorCount()).toBeGreaterThanOrEqual(1)
      expect(errors.getHumanErrorMessage()).toContain('PrivateHelper')
    })

    test('same-module use does not require share', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `view Button { }`,
        },
        {
          path: '/project/ui/labels.tao',
          code: `share view Label { }`,
        },
        {
          path: '/project/ui/forms.tao',
          code: `
          use Button, Label
          view LoginForm {
            Button { }
            Label { }
          }
        `,
        },
      ])
      const errors = result.getErrors()
      expect(errors.errorCount()).toBe(0)
    })

    test(`imports don't crash the compiler`, async () => {
      const errors = await parseASTWithErrors(`use Foo from app/ui`)
      expect(errors).toBeDefined()
    })
  })
})

describe('module system edge cases', () => {
  test('error when importing from non-existent module path', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `
          use Button from ./non/existent/path
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('Cannot resolve module path')
  })

  test('multiple files with same declaration name in same module', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/buttons.tao',
        code: `view Button { }`,
      },
      {
        path: '/project/ui/special-buttons.tao',
        code: `view Button { }`,
      },
      {
        path: '/project/ui/forms.tao',
        code: `
          use Button
          view Form {
            Button
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use Button from ./ui/buttons
          view Button { }
          view MainView {
            Button
          }
        `,
      },
    ])
    // Should work - local Button shadows imported Button
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use Button, Input, Label from ./ui/components
          view Form {
            Label { }
            Input { }
            Button { }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
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
          use InternalHelper from ./ui/internal
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('InternalHelper')
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
          use PublicButton from ./ui/mixed
          view MainView {
            PublicButton
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })
})
