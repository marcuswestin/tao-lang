import { AST } from '@parser/parser'
import { describe, expect, parseAST, test } from './test-utils/test-harness'

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
