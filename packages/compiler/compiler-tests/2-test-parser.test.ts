import { AST } from '@parser/parser'
import { describe, expect, parseAST, parseASTWithErrors, resolveReferences, test } from './test-utils/test-harness'

describe('parse:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('no newlines in code', async () => {
    const document = await parseAST(`app MyApp { ui MyView } view MyView { }`)
    expect(document).toBeDefined()
  })

  test('basic app', async () => {
    const appFile = await parseAST(`
        app MyApp {
            ui MyView
        }
        view MyView {}
        view Text {}
    `)

    const appDeclaration = appFile.statements.first.as_AppDeclaration
    appDeclaration.expect('type').toBe('app')
    appDeclaration.expect('name').toBe('MyApp')
    const uiView = appDeclaration.appStatements.first.ui.as_ViewDeclaration
    uiView.expect('name').toBe('MyView')
    const viewDeclaration = appFile.statements.second.as_ViewDeclaration
    expect(viewDeclaration.unwrap()).toEqual(uiView.unwrap())
  })

  test('reference validation errors', async () => {
    const errorReport = await parseASTWithErrors(`
        app MyApp {
            ui MyApp
        }
        view MyView {
            Text value "Hello World"
        }
    `)
    const messages = errorReport.getHumanErrorMessages().join('\n')
    expect(messages).toContain('Could not resolve reference')
    // When ui references an app name, resolution fails (Declaration includes views/aliases/actions). If it resolved, validator would report "App ui must be a view declaration".
  })

  test('parses action with parameters and inject body', async () => {
    const doc = await parseAST(`
      action TestAction message string {
        inject \`\`\`ts {
          alert("Test Action")
        }
        \`\`\`
      }
    `)
    const action = doc.statements.first.as_ActionDeclaration
    action.expect('name').toBe('TestAction')
    expect(action.unwrap().parameterList?.parameters.length).toBe(1)
    expect(action.unwrap().block.statements.length).toBe(1)
  })

  test('parses inline action expression in view call argument', async () => {
    const doc = await parseAST(`
      view Btn title string, Action any { }
      view V {
        state n = 0
        Btn title "Go", Action action onPress { }
      }
    `)
    const viewV = doc.statements.second.as_ViewDeclaration
    const render = viewV.block.statements.last.as_ViewRender
    expect(render.unwrap().$type).toBe('ViewRender')
    const actionArg = render.argumentList?.arguments[1]!
    expect(actionArg.name).toBe('Action')
    const val = actionArg.value
    expect(AST.isActionExpression(val)).toBe(true)
    if (AST.isActionExpression(val)) {
      expect(val.name).toBe('onPress')
    }
  })
})

describe('module declaration visibility', () => {
  test('parses hide view declaration', async () => {
    const doc = await parseAST(`hide view PrivateView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('hide')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PrivateView')
  })

  test('parses share view declaration', async () => {
    const doc = await parseAST(`share view PublicView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('share')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PublicView')
  })

  test('parses bare app declaration (no visibility modifier)', async () => {
    const doc = await parseAST(`
      app PrivateApp { ui MyView }
      view MyView { }
    `)
    doc.statements.first.as_AppDeclaration.expect('name').toBe('PrivateApp')
    const myView = doc.statements.second.as_ViewDeclaration
    myView.expect('name').toBe('MyView')
  })

  test('parses share app declaration', async () => {
    const doc = await parseAST(`
      share app PublicApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.statements.first.as_ModuleDeclaration
    appDecl.expect('visibility').toBe('share')
    appDecl.declaration.as_AppDeclaration.expect('name').toBe('PublicApp')
  })

  test('parses declaration without visibility modifier (default)', async () => {
    const doc = await parseAST(`view DefaultView { }`)
    const viewDecl = doc.statements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('DefaultView')
  })
})

describe('alias statements', () => {
  test('top-level alias', async () => {
    const doc = await parseAST(`
      alias pi = 3
      view MyView { }
    `)
    const alias = doc.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('pi')
    alias.value.as_NumberLiteral.expect('number').toBe(3)
  })

  test('alias with number literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias age = 1
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('age')
    alias.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('alias with string literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias greeting = "hello"
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
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
    const view = doc.statements.first.as_ViewDeclaration
    const first = view.block.statements.first.as_AssignmentDeclaration
    first.expect('name').toBe('name')
    first.value.as_StringLiteral.expect('string').toBe('world')
    const second = view.block.statements.second.as_AssignmentDeclaration
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
    const view = doc.statements.second.as_ViewDeclaration
    view.block.statements.first.as_AssignmentDeclaration.expect('name').toBe('msg')
    const st = view.unwrap().block.statements[1]
    expect(AST.isViewRender(st)).toBe(true)
    expect((st as AST.ViewRender).view?.ref?.name).toBe('Text')
  })

  test('identifier reference in argument', async () => {
    const doc = await parseAST(`
      view Text value string { }
      view MyView {
        alias msg = "hi"
        Text value msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.second.as_ViewRender
    const arg = render.argumentList.arguments.first
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
    const view = doc.statements.second.as_ViewDeclaration
    const container = view.block.statements.first.as_ViewRender
    const nestedAlias = container.block.statements.first.as_AssignmentDeclaration
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
    const view = doc.statements.first.as_ViewDeclaration
    const aliasY = view.block.statements.second.as_AssignmentDeclaration
    aliasY.value.as_NamedReference.referenceName.as_AssignmentDeclaration.expect('name').toBe('x')
  })

  test('alias used as view argument resolves', async () => {
    const doc = await resolveReferences(`
      view Text label string { }
      view MyView {
        alias msg = "hi"
        Text label msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.second.as_ViewRender
    const arg = render.argumentList.arguments.first
    arg.value.as_NamedReference.referenceName.as_AssignmentDeclaration.expect('name').toBe('msg')
  })

  test('view parameter resolves as identifier reference', async () => {
    const doc = await resolveReferences(`
      view Text label string { }
      view MyView label string {
        Text label label
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.first.as_ViewRender
    const arg = render.argumentList.arguments.first
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
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.last.as_ViewRender
    render.argumentList.arguments.first.value.as_NamedReference.referenceName.as_AssignmentDeclaration.expect('name')
      .toBe('a')
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
