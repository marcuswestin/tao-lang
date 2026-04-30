import { decodeTaoTemplateTextChunk } from '@compiler/codegen/tao-template-text-chunk'
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
            Text Value "Hello World"
        }
    `)
    const messages = errorReport.getHumanErrorMessages().join('\n')
    expect(messages).toContain('Could not resolve reference')
    // When ui references an app name, resolution fails (Declaration includes views/aliases/actions). If it resolved, validator would report "App ui must be a view declaration".
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
    expect(action.unwrap().parameterList?.parameters.length).toBe(1)
    expect(action.unwrap().block.statements.length).toBe(1)
  })

  test('parses anonymous inline action expression in view call argument', async () => {
    const doc = await parseAST(`
      view Btn Title text, OnPress action { }
      view V {
        state N = 0
        Btn "Go", action { set N = 1 }
      }
    `)
    const viewV = doc.statements.second.as_ViewDeclaration
    const render = viewV.block.statements.last.as_ViewRender
    expect(render.unwrap().$type).toBe('ViewRender')
    const actionArg = render.argumentList?.arguments[1]!
    expect(AST.isActionExpression(actionArg)).toBe(true)
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
    expect(render.unwrap().$type).toBe('ActionRender')
    render.action.as_ActionDeclaration.expect('name').toBe('LogEvent')
    const arg = render.argumentList!.arguments[0]!
    expect(AST.isStringTemplateExpression(arg)).toBe(true)
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
    render.action.as_ActionDeclaration.expect('name').toBe('Notify')
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
    const arg = render.argumentList.arguments[0]!
    expect(AST.isUnaryExpression(arg)).toBe(true)
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
    const arg = render.argumentList.arguments[0]!
    expect(AST.isMemberAccessExpression(arg)).toBe(true)
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
    expect(render.unwrap().$type).toBe('ActionRender')
    render.action.as_ActionDeclaration.expect('name').toBe('Inner')
    const innerBlock = render.block.unwrap()
    expect(innerBlock.statements).toHaveLength(1)
    expect(AST.isDebugger(innerBlock.statements[0]!)).toBe(true)
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
      alias Pi = 3
      view MyView { }
    `)
    const alias = doc.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Pi')
    alias.value.as_NumberLiteral.expect('number').toBe(3)
  })

  test('alias with number literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Age = 1
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Age')
    alias.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('alias with string literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Greeting = "hello"
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Greeting')
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    expect(tmpl.segments[0]?.text).toBe('hello')
  })

  test('multiple aliases in a view', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Name = "world"
        alias Count = 42
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const first = view.block.statements.first.as_AssignmentDeclaration
    first.expect('name').toBe('Name')
    const tmpl = first.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    expect(tmpl.segments[0]?.text).toBe('world')
    const second = view.block.statements.second.as_AssignmentDeclaration
    second.expect('name').toBe('Count')
    second.value.as_NumberLiteral.expect('number').toBe(42)
  })

  test('string template parses ${…} as AST expression segments (not post-processed text)', async () => {
    // Use normal string concat so Tao source contains real `${` (nested template literals can leave a `\\` before `$`).
    const doc = await parseAST(
      ['view MyView {', '  state N = 1', '  alias Msg = "a ${N} b"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.second.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(3)
    expect(tmpl.segments[0]?.text).toBe('a ')
    expect(tmpl.segments[1]?.expression).toBeDefined()
    expect(AST.isMemberAccessExpression(tmpl.segments[1]!.expression!)).toBe(true)
    expect(tmpl.segments[2]?.text).toBe(' b')
  })

  test('string template interpolation accepts an object literal expression', async () => {
    // Object literals inside `${…}` exercise the `{` / `}` clones in the interp lexer mode
    // (BraceOpenInterp / BraceCloseInterp with CATEGORIES pointing at the original keywords).
    const doc = await parseAST(
      ['view MyView {', '  alias Msg = "x ${ { a 1 } } y"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(3)
    expect(tmpl.segments[0]?.text).toBe('x ')
    expect(tmpl.segments[1]?.expression).toBeDefined()
    expect(AST.isObjectLiteral(tmpl.segments[1]!.expression!)).toBe(true)
    expect(tmpl.segments[2]?.text).toBe(' y')
  })

  test('nested string templates are rejected (deferred feature)', async () => {
    // `STRING_START` is intentionally excluded from the `interp` mode token list, so an inner `"` inside `${…}`
    // fails at the lexer and then the parser. This is the gate for the deferred nested-template feature.
    const report = await parseASTWithErrors(
      ['view MyView {', '  alias Msg = "a ${ "b" } c"', '}'].join('\n'),
    )
    expect(report.hasError()).toBe(true)
  })

  test('view parameter is in scope inside ${…}', async () => {
    // This is the scope case the post-parse reify approach could not handle (parameters were not included in the
    // synthetic prefix). Under the multi-mode lexer, the interpolation is part of the host CST so the parameter
    // resolves through the normal Langium scope chain.
    const doc = await parseAST(
      ['view Greeting Name text {', '  alias M = "Hi ${Name}"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    const segExpr = tmpl.segments[1]?.expression
    expect(segExpr).toBeDefined()
    expect(AST.isMemberAccessExpression(segExpr!)).toBe(true)
  })

  test('string template preserves raw escape sequences in segment text, and decoder unescapes them', async () => {
    // The lexer captures the raw slice (e.g. `a\\nb`) and the codegen decoder (`decodeTaoTemplateTextChunk`) is
    // responsible for turning `\n`, `\t`, `\"`, `\\`, `\$`, `\r` into their unescaped characters. This test pins
    // down both sides of that contract (raw-text preserved at parse time, decoder produces expected output).
    const doc = await parseAST(
      ['view V {', '  alias M = "a\\nb\\tc\\\\d\\"e\\$f"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    const raw = tmpl.segments[0]?.text
    expect(raw).toBe('a\\nb\\tc\\\\d\\"e\\$f')
    expect(decodeTaoTemplateTextChunk(raw!)).toBe('a\nb\tc\\d"e$f')
  })

  test('alias alongside view render statements', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view MyView {
        alias Msg = "hi"
        Text "hello"
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    view.block.statements.first.as_AssignmentDeclaration.expect('name').toBe('Msg')
    const st = view.unwrap().block.statements[1]
    expect(AST.isViewRender(st)).toBe(true)
    expect((st as AST.ViewRender).view?.ref?.name).toBe('Text')
  })

  test('identifier reference in argument', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view MyView {
        alias Msg = "hi"
        Text Msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.second.as_ViewRender
    const arg = render.argumentList!.arguments[0]!
    expect(AST.isMemberAccessExpression(arg)).toBe(true)
  })

  test('alias in nested view body', async () => {
    const doc = await parseAST(`
      view Container { }
      view MyView {
        Container {
          alias Nested = 99
        }
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const container = view.block.statements.first.as_ViewRender
    const nestedAlias = container.block.statements.first.as_AssignmentDeclaration
    nestedAlias.expect('name').toBe('Nested')
    nestedAlias.value.as_NumberLiteral.expect('number').toBe(99)
  })
})

describe('scope resolution', () => {
  test('alias reference resolves to alias statement', async () => {
    const doc = await resolveReferences(`
      view MyView {
        alias X = 1
        alias Y = X
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const aliasY = view.block.statements.second.as_AssignmentDeclaration
    aliasY.value.as_MemberAccessExpression.root.as_AssignmentDeclaration.expect('name').toBe('X')
  })

  test('alias used as view argument resolves', async () => {
    const doc = await resolveReferences(`
      view Text Value text { }
      view MyView {
        alias Msg = "hi"
        alias Check = Msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.second.as_AssignmentDeclaration
    const val = alias.value.as_MemberAccessExpression
    expect(val.unwrap().root.ref).toBeDefined()
    expect(AST.isAssignmentDeclaration(val.unwrap().root.ref)).toBe(true)
  })

  test('view parameter resolves as identifier reference', async () => {
    const doc = await resolveReferences(`
      view Text Value text { }
      view MyView Label text {
        alias X = Label
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const val = alias.value.as_MemberAccessExpression
    expect(val.unwrap().root.ref).toBeDefined()
    expect(AST.isParameterDeclaration(val.unwrap().root.ref)).toBe(true)
  })

  test('multiple aliases resolve independently', async () => {
    const doc = await resolveReferences(`
      view Text Value text { }
      view MyView {
        alias A = "hello"
        alias B = 42
        alias Check = A
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.last.as_AssignmentDeclaration
    const val = alias.value.as_MemberAccessExpression
    expect(val.unwrap().root.ref).toBeDefined()
    expect(AST.isAssignmentDeclaration(val.unwrap().root.ref)).toBe(true)
  })
})

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

describe('objects, member access, nested set', () => {
  test('parses object literal and member access', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view V {
        alias O = { x 1, y 2 }
        Text O.x
      }
    `)
    const render = doc.statements.second.as_ViewDeclaration.block.statements.last.as_ViewRender
    const arg = render.unwrap().argumentList!.arguments[0]!
    expect(AST.isMemberAccessExpression(arg)).toBe(true)
  })

  test('set bare state name has root S and empty properties path', async () => {
    const doc = await parseAST(`
      view V {
        state S = 1
        action A {
          set S = 2
        }
      }
    `)
    const target = doc.statements.first.as_ViewDeclaration.block.statements.second.as_ActionDeclaration.block.statements
      .first.as_StateUpdate.unwrap().target
    expect(target.properties).toEqual([])
    expect(target.root.ref?.name).toBe('S')
  })

  test('parses nested state update path', async () => {
    const doc = await parseAST(`
      view V {
        state S = { a 1 }
        action A {
          set S.a = 2
        }
      }
    `)
    const action = doc.statements.first.as_ViewDeclaration.block.statements.second.as_ActionDeclaration
    const target = action.block.statements.first.as_StateUpdate.unwrap().target
    expect(target.properties).toEqual(['a'])
    expect(target.root.ref?.name).toBe('S')
  })

  test('parses single-property object literal', async () => {
    const doc = await parseAST(`
      view V {
        alias A = { x 1 }
      }
    `)
    const alias = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration
    const obj = alias.value.as_ObjectLiteral
    expect(obj.properties.length).toBe(1)
    expect(obj.properties.first.name).toBe('x')
    obj.properties.first.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('parses multi-property object literal', async () => {
    const doc = await parseAST(`
      view V {
        alias A = { x 1, y "two" }
      }
    `)
    const obj = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value
      .as_ObjectLiteral
    expect(obj.properties.length).toBe(2)
  })

  test('parses nested object literals two and three levels deep', async () => {
    const doc = await parseAST(`
      view V {
        alias A2 = { inner { x 1 } }
        alias A3 = { a { b { c 1 } } }
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const inner2w = view.block.statements.first.as_AssignmentDeclaration.value.as_ObjectLiteral.properties.first.value
    expect(AST.isObjectLiteral(inner2w.as_ObjectLiteral.unwrap())).toBe(true)
    const inner3a = view.block.statements.second.as_AssignmentDeclaration.value.as_ObjectLiteral.properties.first.value
      .as_ObjectLiteral
    const inner3b = inner3a.properties.first.value.as_ObjectLiteral
    inner3b.properties.first.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('parses chained member access one to three dots', async () => {
    const doc = await parseAST(`
      view V {
        alias A = { x { y { z 1 } } }
        alias B1 = A.x
        alias B2 = A.x.y
        alias B3 = A.x.y.z
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const stmts = view.block.statements
    expect(stmts[1].as_AssignmentDeclaration.value.as_MemberAccessExpression.unwrap().properties).toEqual(['x'])
    expect(stmts[2].as_AssignmentDeclaration.value.as_MemberAccessExpression.unwrap().properties).toEqual(['x', 'y'])
    expect(stmts[3].as_AssignmentDeclaration.value.as_MemberAccessExpression.unwrap().properties).toEqual([
      'x',
      'y',
      'z',
    ])
  })

  test('parses nested state update paths at two and three levels and compound +=', async () => {
    const doc = await parseAST(`
      view V {
        state S = { x { y { z 0 } }, count 0 }
        action A2 { set S.x.y = 2 }
        action A3 { set S.x.y.z = 3 }
        action Add { set S.count += 1 }
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const stmts = view.block.statements
    expect(stmts[1].as_ActionDeclaration.block.statements.first.as_StateUpdate.unwrap().target.properties)
      .toEqual(['x', 'y'])
    expect(stmts[2].as_ActionDeclaration.block.statements.first.as_StateUpdate.unwrap().target.properties)
      .toEqual(['x', 'y', 'z'])
    expect(stmts[3].as_ActionDeclaration.block.statements.first.as_StateUpdate.unwrap().operator)
      .toBe('+=')
  })

  test('parses object literal as state initializer', async () => {
    const doc = await parseAST(`
      view V {
        state S = { a 1 }
      }
    `)
    const state = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration
    state.expect('type').toBe('state')
    state.expect('name').toBe('S')
    state.value.as_ObjectLiteral.properties.first.expect('name').toBe('a')
    state.value.as_ObjectLiteral.properties.first.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('parses object literal with trailing comma after last property', async () => {
    const doc = await parseAST(`
      view V {
        alias O = { x 1, y 2, }
      }
    `)
    const obj = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value
      .as_ObjectLiteral
    expect(obj.properties.length).toBe(2)
  })

  test('empty object literal `{ }` does not parse as ObjectLiteral (requires at least one property)', async () => {
    const errors = await parseASTWithErrors(`
      view V {
        alias E = { }
      }
    `)
    expect(errors.getHumanErrorMessages().join('\n').length).toBeGreaterThan(0)
  })

  test('object literal in alias value position parses as ObjectLiteral AST', async () => {
    const doc = await parseAST(`
      view V {
        alias O = { a 1 }
      }
    `)
    const val = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.unwrap().value
    expect(val.$type).toBe('ObjectLiteral')
  })
})

describe('struct/item types', () => {
  test('parses `type Person is { Name text, Age number }` flat struct declaration', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V { }
    `)
    const decl = doc.statements.first.as_TypeDeclaration
    decl.expect('name').toBe('Person')
    const struct = decl.unwrap().base
    expect(AST.isStructTypeExpression(struct)).toBe(true)
    if (AST.isStructTypeExpression(struct)) {
      expect(struct.fields).toHaveLength(2)
      expect(struct.fields[0]?.name).toBe('Name')
      expect(struct.fields[1]?.name).toBe('Age')
      expect(AST.isPrimitiveTypeRef(struct.fields[0]!.type)).toBe(true)
      expect(AST.isPrimitiveTypeRef(struct.fields[1]!.type)).toBe(true)
    }
  })

  test('parses nested struct field declaration `Job { Title text }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view V { }
    `)
    const struct = doc.statements.first.as_TypeDeclaration.unwrap().base
    if (!AST.isStructTypeExpression(struct)) {
      throw new Error('expected struct base')
    }
    const jobField = struct.fields[1]!
    expect(jobField.name).toBe('Job')
    expect(AST.isStructTypeExpression(jobField.type)).toBe(true)
    if (AST.isStructTypeExpression(jobField.type)) {
      expect(jobField.type.fields).toHaveLength(1)
      expect(jobField.type.fields[0]?.name).toBe('Title')
    }
  })

  test('parses typed struct literal `Person { Name "Ro", Age 40 }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V {
        alias Ro = Person { Name "Ro", Age 40 }
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const val = alias.unwrap().value
    expect(AST.isTypedLiteralExpression(val)).toBe(true)
    if (AST.isTypedLiteralExpression(val) && AST.isNamedTypeRef(val.type)) {
      expect(val.type.ref.$refText).toBe('Person')
      expect(AST.isObjectLiteral(val.value)).toBe(true)
    }
  })

  test('parses parameter typed by a declared struct type', async () => {
    const doc = await parseAST(`
      type Person is { Name text }
      view Profile P Person { }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const param = view.unwrap().parameterList!.parameters[0]!
    expect(param.name).toBe('P')
    expect(AST.isNamedTypeRef(param.type)).toBe(true)
    if (AST.isNamedTypeRef(param.type)) {
      expect(param.type.ref?.$refText).toBe('Person')
      expect(param.type.segments).toEqual([])
    }
  })

  test('parses nested type reference `Person.Job` in parameter position', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view ShowJob J Person.Job { }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const param = view.unwrap().parameterList!.parameters[0]!
    expect(AST.isNamedTypeRef(param.type)).toBe(true)
    if (AST.isNamedTypeRef(param.type)) {
      expect(param.type.ref?.$refText).toBe('Person')
      expect(param.type.segments).toEqual(['Job'])
    }
  })
})

describe('ObjectLiteral vs Block grammar invariant', () => {
  test('alias value `{ x 1 }` is an ObjectLiteral, not a Block', async () => {
    const doc = await parseAST(`
      view V {
        alias O = { x 1 }
      }
    `)
    const val = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.unwrap().value
    expect(AST.isObjectLiteral(val)).toBe(true)
    expect(AST.isBlock(val)).toBe(false)
  })

  test('state initializer `{ x 1 }` is an ObjectLiteral, not a Block', async () => {
    const doc = await parseAST(`
      view V {
        state S = { x 1 }
      }
    `)
    const val = doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.unwrap().value
    expect(AST.isObjectLiteral(val)).toBe(true)
    expect(AST.isBlock(val)).toBe(false)
  })

  test('view body `{}` is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`view V { }`)
    const body = doc.statements.first.as_ViewDeclaration.unwrap().block
    expect(AST.isBlock(body)).toBe(true)
    expect(AST.isObjectLiteral(body)).toBe(false)
  })

  test('action body `{}` is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`
      view V {
        action A { }
      }
    `)
    const action = doc.statements.first.as_ViewDeclaration.block.statements.first.as_ActionDeclaration.unwrap()
    expect(AST.isBlock(action.block)).toBe(true)
    expect(AST.isObjectLiteral(action.block)).toBe(false)
  })

  test('inline action expression body is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`
      view Btn Title text, OnPress action { }
      view V {
        Btn "t", action { }
      }
    `)
    const render = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
    const actionArg = render.argumentList!.arguments[1]!
    expect(AST.isActionExpression(actionArg)).toBe(true)
    if (AST.isActionExpression(actionArg)) {
      expect(AST.isBlock(actionArg.block)).toBe(true)
      expect(AST.isObjectLiteral(actionArg.block)).toBe(false)
    }
  })

  test('`{` after a view callee parses as ViewRender block, not an argument ObjectLiteral', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view Inner { }
      view Outer {
        Inner { Text "x" }
      }
    `)
    const render = doc.statements.last.as_ViewDeclaration.block.statements.first.as_ViewRender
    const rr = render.unwrap() as AST.ViewRender
    expect(rr.view.$refText).toBe('Inner')
    expect(rr.argumentList).toBeUndefined()
    expect(rr.block).toBeDefined()
    expect(rr.block!.statements).toHaveLength(1)
    expect(rr.block!.statements[0]!.$type).toBe('ViewRender')
  })

  test('object-literal-shaped content `{ x 1 }` in a view body does not parse as an ObjectLiteral', async () => {
    const errors = await parseASTWithErrors(`
      view V {
        x 1
      }
    `)
    expect(errors.getHumanErrorMessages().join('\n').length).toBeGreaterThan(0)
  })

  test('object-literal-shaped content in an inline action body does not parse as an ObjectLiteral', async () => {
    const errors = await parseASTWithErrors(`
      view Btn Title text, OnPress action { }
      view V {
        Btn "t", action { x 1 }
      }
    `)
    expect(errors.getHumanErrorMessages().join('\n').length).toBeGreaterThan(0)
  })
})

describe('local parameter types (Phase 1):', () => {
  test('view Badge Title is text parses with localSuperType', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const param = view.unwrap().parameterList!.parameters[0]!
    expect(param.name).toBe('Title')
    expect(param.localSuperType).toBeDefined()
    expect(AST.isPrimitiveTypeRef(param.localSuperType)).toBe(true)
    if (AST.isPrimitiveTypeRef(param.localSuperType)) {
      expect(param.localSuperType.primitive).toBe('text')
    }
    expect(param.type).toBeUndefined()
  })

  test('view with multiple local types parses correctly', async () => {
    const doc = await parseAST(`
      view Button Title is text, Action is action { }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const params = view.unwrap().parameterList!.parameters
    expect(params).toHaveLength(2)
    expect(params[0]!.name).toBe('Title')
    expect(params[0]!.localSuperType).toBeDefined()
    expect(params[1]!.name).toBe('Action')
    expect(params[1]!.localSuperType).toBeDefined()
  })

  test('mixed local and explicit params parse correctly', async () => {
    const doc = await parseAST(`
      view Card Title is text, Size number { }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const params = view.unwrap().parameterList!.parameters
    expect(params[0]!.name).toBe('Title')
    expect(params[0]!.localSuperType).toBeDefined()
    expect(params[0]!.type).toBeUndefined()
    expect(params[1]!.name).toBe('Size')
    expect(params[1]!.localSuperType).toBeUndefined()
    expect(params[1]!.type).toBeDefined()
  })

  test('typed literal with dotted constructor head parses as NamedTypeRef with segments', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
      view Root {
        Badge Badge.Title "x"
      }
    `)
    const stmts = doc.unwrap().statements
    expect(stmts.length).toBe(2)
    const root = stmts[1]!
    expect(AST.isViewDeclaration(root)).toBe(true)
    if (!AST.isViewDeclaration(root)) {
      return
    }
    const render = root.block.statements[0]!
    expect(AST.isViewRender(render)).toBe(true)
    if (!AST.isViewRender(render)) {
      return
    }
    const args = render.argumentList?.arguments ?? []
    expect(args.length).toBe(1)
    const arg = args[0]!
    expect(AST.isTypedLiteralExpression(arg)).toBe(true)
    if (AST.isTypedLiteralExpression(arg) && AST.isNamedTypeRef(arg.type)) {
      expect(arg.type.ref?.$refText).toBe('Badge')
      expect(arg.type.segments).toEqual(['Title'])
    }
  })
})

describe('dot-local type ref (Phase 2):', () => {
  test('`.Title "x"` parses as TypedLiteralExpression with DotLocalTypeRef', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
      view Root {
        Badge .Title "x"
      }
    `)
    const stmts = doc.unwrap().statements
    const root = stmts[1]!
    if (!AST.isViewDeclaration(root)) {
      return
    }
    const render = root.block.statements[0]!
    expect(AST.isViewRender(render)).toBe(true)
    if (!AST.isViewRender(render)) {
      return
    }
    const args = render.argumentList?.arguments ?? []
    expect(args.length).toBe(1)
    const arg = args[0]!
    expect(AST.isTypedLiteralExpression(arg)).toBe(true)
    if (AST.isTypedLiteralExpression(arg)) {
      expect(AST.isDotLocalTypeRef(arg.type)).toBe(true)
      if (AST.isDotLocalTypeRef(arg.type)) {
        expect(arg.type.name).toBe('Title')
      }
    }
  })

  test('`.Count 42` parses with number value', async () => {
    const doc = await parseAST(`
      view Counter Count is number { }
      view Root {
        Counter .Count 42
      }
    `)
    const stmts = doc.unwrap().statements
    const root = stmts[1]!
    if (!AST.isViewDeclaration(root)) {
      return
    }
    const render = root.block.statements[0]!
    if (!AST.isViewRender(render)) {
      return
    }
    const arg = render.argumentList?.arguments[0]!
    expect(AST.isTypedLiteralExpression(arg)).toBe(true)
    if (AST.isTypedLiteralExpression(arg)) {
      expect(AST.isDotLocalTypeRef(arg.type)).toBe(true)
      expect(AST.isNumberLiteral(arg.value)).toBe(true)
    }
  })

  test('`.Person { Name "Ro" }` parses with object literal value', async () => {
    const doc = await parseAST(`
      type PersonData is { Name text }
      view Profile Person is PersonData { }
      view Root {
        Profile .Person { Name "Ro" }
      }
    `)
    const stmts = doc.unwrap().statements
    const root = stmts[2]!
    if (!AST.isViewDeclaration(root)) {
      return
    }
    const render = root.block.statements[0]!
    if (!AST.isViewRender(render)) {
      return
    }
    const arg = render.argumentList?.arguments[0]!
    expect(AST.isTypedLiteralExpression(arg)).toBe(true)
    if (AST.isTypedLiteralExpression(arg)) {
      expect(AST.isDotLocalTypeRef(arg.type)).toBe(true)
      expect(AST.isObjectLiteral(arg.value)).toBe(true)
    }
  })

  test('multiple dot-local args parse: `.Title "x", .Subtitle "y"`', async () => {
    const doc = await parseAST(`
      view Badge Title is text, Subtitle is text { }
      view Root {
        Badge .Title "x", .Subtitle "y"
      }
    `)
    const stmts = doc.unwrap().statements
    const root = stmts[1]!
    if (!AST.isViewDeclaration(root)) {
      return
    }
    const render = root.block.statements[0]!
    if (!AST.isViewRender(render)) {
      return
    }
    const args = render.argumentList?.arguments ?? []
    expect(args.length).toBe(2)
    for (const arg of args) {
      expect(AST.isTypedLiteralExpression(arg)).toBe(true)
      if (AST.isTypedLiteralExpression(arg)) {
        expect(AST.isDotLocalTypeRef(arg.type)).toBe(true)
      }
    }
  })
})

describe('action local parameter types (Phase 3):', () => {
  test('action Bump Step is number parses with localSuperType', async () => {
    const doc = await parseAST(`
      action Bump Step is number { }
    `)
    const action = doc.statements.first.as_ActionDeclaration
    const param = action.unwrap().parameterList!.parameters[0]!
    expect(param.name).toBe('Step')
    expect(param.localSuperType).toBeDefined()
    expect(param.type).toBeUndefined()
  })

  test('do Bump .Step 3 parses dot shorthand in action call', async () => {
    const doc = await parseAST(`
      action Bump Step is number { }
      action Use {
        do Bump .Step 3
      }
    `)
    const use = doc.statements.second.as_ActionDeclaration
    const render = use.block.statements.first.as_ActionRender
    const arg = render.argumentList!.arguments[0]!
    expect(AST.isTypedLiteralExpression(arg)).toBe(true)
    if (AST.isTypedLiteralExpression(arg)) {
      expect(AST.isDotLocalTypeRef(arg.type)).toBe(true)
      if (AST.isDotLocalTypeRef(arg.type)) {
        expect(arg.type.name).toBe('Step')
      }
    }
  })
})
