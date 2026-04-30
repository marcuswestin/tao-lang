import {
  describe,
  expect,
  parseAST,
  parseMultipleFiles,
  test,
} from './test-utils/test-harness'

describe('use statement parsing', () => {
  test('parses use statement with single import', async () => {
    const doc = await parseAST(`
      use PublicView from ./ui/views
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView'])
  })

  test('parses use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use PublicView, AnotherView, ThirdView from ./ui/views
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('./ui/views')
    expect(useStmt.importedNames).toEqual(['PublicView', 'AnotherView', 'ThirdView'])
  })

  test('parses use statement with parent path', async () => {
    const doc = await parseAST(`
      use Button from ../shared/components
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('../shared/components')
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses multiple use statements', async () => {
    const doc = await parseAST(`
      use PublicView from ./ui/views
      use Button, Input from ./ui/components
      view MyView { }
    `)
    expect(doc.statements.length).toBe(3)
    expect(doc.statements[0].as_UseStatement.modulePath).toBe('./ui/views')
    expect(doc.statements[1].as_UseStatement.modulePath).toBe('./ui/components')
  })

  test('parses same-module use statement (no from clause)', async () => {
    const doc = await parseAST(`
      use Button
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    useStmt.expect('modulePath').toBeUndefined()
    expect(useStmt.importedNames).toEqual(['Button'])
  })

  test('parses same-module use statement with multiple imports', async () => {
    const doc = await parseAST(`
      use Button, Input, Label
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
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
    expect(appFile.statements.first.as_UseStatement.importedNames).toEqual(['PublicView'])
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

  test('error when importing hide-private declaration', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/views.tao',
        code: `hide view PrivateView { }`, // Explicitly private to this file
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

  test('shared and hide (non-export) declarations are accessible from within the same file', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app/Views.tao',
        code: `
          share view SharedView { }
          hide view FileView { }
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

    test('hide-private declarations are NOT accessible via use statement', async () => {
      const result = await parseMultipleFiles([
        {
          path: '/project/ui/buttons.tao',
          code: `hide view PrivateHelper { }`,
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

    test('named module path parses without crashing', async () => {
      const doc = await parseAST(`use Foo from app/ui`)
      expect(doc.statements.first.as_UseStatement.modulePath).toBe('app/ui')
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

  test('mixed visibility in same file - share and hide declarations', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/ui/mixed.tao',
        code: `
          share view PublicButton { }
          hide view PrivateHelper { }
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

describe('standard library imports (use @tao/...)', () => {
  const STD_LIB_ROOT = '/tao-std-lib'

  test('parses use statement with @tao/ module path', async () => {
    const doc = await parseAST(`
      use Col from @tao/ui
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('@tao/ui')
    expect(useStmt.importedNames).toEqual(['Col'])
  })

  test('parses use statement with multiple std-lib imports', async () => {
    const doc = await parseAST(`
      use Col, Row, Text from @tao/ui
      view MyView { }
    `)
    const useStmt = doc.statements.first.as_UseStatement
    expect(useStmt.modulePath).toBe('@tao/ui')
    expect(useStmt.importedNames).toEqual(['Col', 'Row', 'Text'])
  })

  test('error when using @tao/ import without std lib root configured', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `
          use Col from @tao/ui
          view MainView { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('Standard library root is not configured')
  })

  test('imported std-lib view can be referenced', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Views.tao',
        code: `share view Col { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Col from @tao/ui
          view MainView {
            Col
          }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  test('can import multiple std-lib views', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Views.tao',
        code: `
          share view Col { }
          share view Row { }
          share view Text { }
        `,
      },
      {
        path: '/project/app.tao',
        code: `
          use Col, Row, Text from @tao/ui
          view MainView {
            Col {
              Row {
                Text
              }
            }
          }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  test('error when importing non-existent name from std-lib', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Views.tao',
        code: `share view Col { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use NonExistent from @tao/ui
          view MainView { }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('NonExistent')
  })

  test('error when importing non-shared std-lib declaration', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Internal.tao',
        code: `view InternalHelper { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use InternalHelper from @tao/ui
          view MainView { }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(1)
    expect(errors.getHumanErrorMessage()).toContain('InternalHelper')
  })

  test('std-lib and relative imports can coexist', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Views.tao',
        code: `share view Col { }`,
      },
      {
        path: '/project/components/Button.tao',
        code: `share view Button { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Col from @tao/ui
          use Button from ./components
          view MainView {
            Col {
              Button
            }
          }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  test('std-lib imports from multiple @tao/ submodules', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/tao-std-lib/tao/ui/Views.tao',
        code: `share view Col { }`,
      },
      {
        path: '/tao-std-lib/tao/nav/Navigation.tao',
        code: `share view TabBar { }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Col from @tao/ui
          use TabBar from @tao/nav
          view MainView {
            Col {
              TabBar
            }
          }
        `,
      },
    ], { stdLibRoot: STD_LIB_ROOT })
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })
})

describe('type imports via use statement', () => {
  test('same-module type import resolves NamedTypeRef and TypedLiteralExpression', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `type Person is text`,
      },
      {
        path: '/project/types/views.tao',
        code: `
          use Person
          view Greet P Person { }
          view Show {
            Greet Person "Ro"
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  test('cross-module share type can be imported and used as parameter type and typed struct literal', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `share type Person is { Name text }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Person from ./types
          view Greet P Person { }
          view Main {
            Greet Person { Name "Ro" }
          }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })

  test('cross-module type without share cannot be imported', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `type Person is text`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Person from ./types
          view Greet P Person { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBeGreaterThanOrEqual(1)
    expect(errors.getHumanErrorMessage()).toContain('Person')
    expect(errors.getHumanErrorMessage()).toContain(`marked with 'share'`)
  })

  test('cross-module hide type cannot be imported', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `hide type Person is text`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Person from ./types
          view Greet P Person { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBeGreaterThanOrEqual(1)
    expect(errors.getHumanErrorMessage()).toContain('Person')
  })

  test('cross-module type reference without use statement is not visible', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `share type Person is text`,
      },
      {
        path: '/project/app.tao',
        code: `
          view Greet P Person { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBeGreaterThanOrEqual(1)
    expect(errors.getHumanErrorMessage()).toContain('Person')
  })

  test('same-module type without use statement is not visible from another file', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `type Person is text`,
      },
      {
        path: '/project/types/views.tao',
        code: `
          view Greet P Person { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBeGreaterThanOrEqual(1)
    expect(errors.getHumanErrorMessage()).toContain('Person')
  })

  test('typed struct literal type reference resolves via cross-module use', async () => {
    const result = await parseMultipleFiles([
      {
        path: '/project/types/person.tao',
        code: `share type Person is { Name text }`,
      },
      {
        path: '/project/app.tao',
        code: `
          use Person from ./types
          state Ro = Person { Name "Ro" }
          view Main { }
        `,
      },
    ])
    const errors = result.getErrors()
    expect(errors.errorCount()).toBe(0)
  })
})
