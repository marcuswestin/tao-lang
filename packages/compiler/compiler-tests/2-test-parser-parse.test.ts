import { expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, expect, parseAST, parseASTWithErrors, test } from './test-utils/test-harness'

describe('parse:', () => {
  test('no newlines in code', async () => {
    await parseAST(`app MyApp { ui MyView } ui MyView { }`)
  })

  test('basic app', async () => {
    const appFile = await parseAST(`
        app MyApp {
            ui MyView
        }
        ui MyView {}
        ui Text {}
    `)

    const appDeclaration = appFile.statements.first.as_AppDeclaration
    appDeclaration.expect('type').toBe('app')
    appDeclaration.expect('name').toBe('MyApp')
    const uiView = appDeclaration.appStatements.first.as_AppUiStatement.ui.as_ViewDeclaration
    uiView.expect('name').toBe('MyView')
    const viewDeclaration = appFile.statements.second.as_ViewDeclaration
    expect(viewDeclaration.unwrap()).toEqual(uiView.unwrap())
  })

  test('parses ui frame and layout declarations', async () => {
    const appFile = await parseAST(`
      ui Header { }
      frame Card { }
      layout Row { }
    `)
    appFile.statements.first.as_ViewDeclaration.expect('type').toBe('ui')
    appFile.statements.second.as_ViewDeclaration.expect('type').toBe('frame')
    appFile.statements[2].as_ViewDeclaration.expect('type').toBe('layout')
  })

  test('legacy view declaration keyword fails parsing', async () => {
    const errorReport = await parseASTWithErrors(`view Legacy { }`)
    expect(errorReport.parserErrors.length).toBeGreaterThan(0)
  })

  test('reference validation errors', async () => {
    const errorReport = await parseASTWithErrors(`
        app MyApp {
            ui MyApp
        }
        ui MyView {
            Text Value "Hello World"
        }
    `)
    expectHumanMessagesContain(errorReport, 'Could not resolve reference')
    // When ui references an app name, resolution fails (Declaration includes UI declarations/aliases/actions). If it resolved, validator would report that app ui must reference a UI declaration.
  })

  test('parses action with parameters and inject body', async () => {
    const doc = await parseAST(`
      action TestAction Message text {
        inject \`\`\`ts {
          alert("Test Action")
        }
        \`\`\`
      }
    `)
    const action = doc.statements.first.as_ActionDeclaration
    action.expect('name').toBe('TestAction')
    void action.parameterList.parameters.only
    void action.block.statements.only
  })

  test('parses anonymous inline action expression in view call argument', async () => {
    const doc = await parseAST(`
      ui Btn Title text, OnPress action { }
      ui V {
        state N = 0
        Btn "Go", action { set N = 1 }
      }
    `)
    const viewV = doc.statements.second.as_ViewDeclaration
    const render = viewV.block.statements.last.as_ViewRender
    void render.argumentList.arguments[1].as_ActionExpression
  })

  test('parses ActionRender (`do Name args…`) inside an action body', async () => {
    const doc = await parseAST(`
      action LogEvent Message text { }
      action Outer {
        do LogEvent "submitted"
      }
    `)
    const outer = doc.statements.second.as_ActionDeclaration
    const render = outer.block.statements.first.as_ActionRender
    render.action.expect('name').toBe('LogEvent')
    void render.argumentList.arguments[0].as_StringTemplateExpression
  })

  test('parses bare ActionRender with no arguments', async () => {
    const doc = await parseAST(`
      action Notify { }
      action Outer {
        do Notify
      }
    `)
    const outer = doc.statements.second.as_ActionDeclaration
    const render = outer.block.statements.first.as_ActionRender
    render.action.expect('name').toBe('Notify')
  })

  test('parses bare argument — value-only form', async () => {
    const doc = await parseAST(`
      action BumpAction Step number { }
      action Outer {
        do BumpAction -1
      }
    `)
    const outer = doc.statements.second.as_ActionDeclaration
    const render = outer.block.statements.first.as_ActionRender
    void render.argumentList.arguments[0].as_UnaryExpression
  })

  test('parses bare reference argument (alias name only)', async () => {
    const doc = await parseAST(`
      action BumpAction Step number { }
      action Outer {
        alias TwoDown = -2
        do BumpAction TwoDown
      }
    `)
    const outer = doc.statements.second.as_ActionDeclaration
    const render = outer.block.statements.last.as_ActionRender
    void render.argumentList.arguments[0].as_MemberAccessExpression
  })

  test('parses ActionRender with optional trailing block', async () => {
    const doc = await parseAST(`
      action Inner { }
      action Outer {
        do Inner {
          debugger
        }
      }
    `)
    const outer = doc.statements.second.as_ActionDeclaration
    const render = outer.block.statements.first.as_ActionRender
    render.action.expect('name').toBe('Inner')
    void render.block.statements.only.as_Debugger
  })
})
