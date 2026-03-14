import { describe, expect, parseAST, parseASTWithErrors, resolveReferences, test } from './test-utils/test-harness'

describe('parse:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('no newlines in code', async () => {
    const document = await parseAST(`file app MyApp { ui MyView } view MyView { }`)
    expect(document).toBeDefined()
  })

  test('basic app', async () => {
    const appFile = await parseAST(`
        file app MyApp {
            ui MyView
        }
        view MyView {}
        view Text {}
    `)

    const topLevel = appFile.topLevelStatements.first.as_TopLevelDeclaration
    const appDeclaration = topLevel.declaration.as_AppDeclaration
    appDeclaration.expect('type').toBe('app')
    appDeclaration.expect('name').toBe('MyApp')
    const uiView = appDeclaration.appStatements.first.ui.as_ViewDeclaration
    uiView.expect('name').toBe('MyView')
    const viewDeclaration = appFile.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    expect(viewDeclaration.unwrap()).toEqual(uiView.unwrap())
  })

  test('reference validation errors', async () => {
    const errorReport = await parseASTWithErrors(`
        file app MyApp {
            ui MyApp
        }
        view MyView {
            Text value "Hello World"
        }
    `)
    const messages = errorReport.getHumanErrorMessages().join('\n')
    expect(messages).toContain('Could not resolve reference')
    // When ui references an app name, resolution fails (Declaration = ViewDeclaration | AliasDeclaration). If it resolved, validator would report "App ui must be a view declaration".
  })
})

describe('module declaration visibility', () => {
  test('parses file view declaration', async () => {
    const doc = await parseAST(`file view PrivateView { }`)
    const viewDecl = doc.topLevelStatements.first.as_TopLevelDeclaration
    viewDecl.expect('visibility').toBe('file')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PrivateView')
  })

  test('parses share view declaration', async () => {
    const doc = await parseAST(`share view PublicView { }`)
    const viewDecl = doc.topLevelStatements.first.as_TopLevelDeclaration
    viewDecl.expect('visibility').toBe('share')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PublicView')
  })

  test('parses file app declaration', async () => {
    const doc = await parseAST(`
      file app PrivateApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.topLevelStatements.first.as_TopLevelDeclaration
    appDecl.expect('visibility').toBe('file')
    appDecl.declaration.as_AppDeclaration.expect('name').toBe('PrivateApp')
    const myView = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    myView.expect('name').toBe('MyView')
  })

  test('parses share app declaration', async () => {
    const doc = await parseAST(`
      share app PublicApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.topLevelStatements.first.as_TopLevelDeclaration
    appDecl.expect('visibility').toBe('share')
    appDecl.declaration.as_AppDeclaration.expect('name').toBe('PublicApp')
  })

  test('parses declaration without visibility modifier (default)', async () => {
    const doc = await parseAST(`view DefaultView { }`)
    const viewDecl = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    viewDecl.expect('name').toBe('DefaultView')
  })
})

describe('alias statements', () => {
  test('top-level alias', async () => {
    const doc = await parseAST(`
      alias pi = 3
      view MyView { }
    `)
    const alias = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_AliasDeclaration
    alias.expect('name').toBe('pi')
    alias.value.as_NumberLiteral.expect('number').toBe(3)
  })

  test('alias with number literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias age = 1
      }
    `)
    const view = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const alias = view.viewStatements.first.as_AliasDeclaration
    alias.expect('name').toBe('age')
    alias.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('alias with string literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias greeting = "hello"
      }
    `)
    const view = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const alias = view.viewStatements.first.as_AliasDeclaration
    alias.expect('name').toBe('greeting')
    alias.value.as_StringLiteral.expect('string').toBe('hello')
  })

  test('multiple aliases in a view', async () => {
    const doc = await parseAST(`
      view MyView {
        alias name = "world"
        alias count = 42
      }
    `)
    const view = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const first = view.viewStatements.first.as_AliasDeclaration
    first.expect('name').toBe('name')
    first.value.as_StringLiteral.expect('string').toBe('world')
    const second = view.viewStatements.second.as_AliasDeclaration
    second.expect('name').toBe('count')
    second.value.as_NumberLiteral.expect('number').toBe(42)
  })

  test('alias alongside view render statements', async () => {
    const doc = await parseAST(`
      view Text value string { }
      view MyView {
        alias msg = "hi"
        Text value "hello"
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    view.viewStatements.first.as_AliasDeclaration.expect('name').toBe('msg')
    view.viewStatements.second.as_ViewRenderStatement.view.expect('name').toBe('Text')
  })

  test('identifier reference in argument', async () => {
    const doc = await parseAST(`
      view Text value string { }
      view MyView {
        alias msg = "hi"
        Text value msg
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const render = view.viewStatements.second.as_ViewRenderStatement
    const arg = render.args.args.first
    arg.expect('name').toBe('value')
  })

  test('alias in nested view body', async () => {
    const doc = await parseAST(`
      view Container { }
      view MyView {
        Container {
          alias nested = 99
        }
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const container = view.viewStatements.first.as_ViewRenderStatement
    const nestedAlias = container.viewStatements.first.as_AliasDeclaration
    nestedAlias.expect('name').toBe('nested')
    nestedAlias.value.as_NumberLiteral.expect('number').toBe(99)
  })
})

describe('scope resolution', () => {
  test('alias reference resolves to alias statement', async () => {
    const doc = await resolveReferences(`
      view MyView {
        alias x = 1
        alias y = x
      }
    `)
    const view = doc.topLevelStatements.first.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const aliasY = view.viewStatements.second.as_AliasDeclaration
    aliasY.value.as_NamedReference.referenceName.as_AliasDeclaration.expect('name').toBe('x')
  })

  test('alias used as view argument resolves', async () => {
    const doc = await resolveReferences(`
      view Text label string { }
      view MyView {
        alias msg = "hi"
        Text label msg
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const render = view.viewStatements.second.as_ViewRenderStatement
    const arg = render.args.args.first
    arg.value.as_NamedReference.referenceName.as_AliasDeclaration.expect('name').toBe('msg')
  })

  test('view parameter resolves as identifier reference', async () => {
    const doc = await resolveReferences(`
      view Text label string { }
      view MyView label string {
        Text label label
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const render = view.viewStatements.first.as_ViewRenderStatement
    const arg = render.args.args.first
    arg.value.as_NamedReference.referenceName.as_ParameterDeclaration.expect('name').toBe('label')
  })

  test('multiple aliases resolve independently', async () => {
    const doc = await resolveReferences(`
      view Text label string { }
      view MyView {
        alias a = "hello"
        alias b = 42
        Text label a
      }
    `)
    const view = doc.topLevelStatements.second.as_TopLevelDeclaration.declaration.as_ViewDeclaration
    const render = view.viewStatements.last.as_ViewRenderStatement
    render.args.args.first.value.as_NamedReference.referenceName.as_AliasDeclaration.expect('name').toBe('a')
  })
})

describe('alias validation', () => {
  test('error on duplicate alias names in the same scope', async () => {
    const errors = await parseASTWithErrors(`
      view MyView {
        alias x = 1
        alias x = 2
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain("Duplicate identifier 'x'")
  })

  test('no error for same alias name in different scopes', async () => {
    const doc = await resolveReferences(`
      view Container { }
      view MyView {
        alias x = 1
        Container {
          alias x = 2
        }
      }
    `)
    expect(doc).toBeDefined()
  })

  test('error on unresolved identifier reference', async () => {
    const errors = await parseASTWithErrors(`
      view Text label string { }
      view MyView {
        Text label unknown
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain('Could not resolve reference')
  })

  test('warning when alias shadows a view parameter', async () => {
    const errors = await parseASTWithErrors(`
      view MyView label string {
        alias label = "shadowed"
      }
    `)
    expect(errors.getHumanErrorMessage()).toContain("Duplicate identifier 'label'")
  })
})
