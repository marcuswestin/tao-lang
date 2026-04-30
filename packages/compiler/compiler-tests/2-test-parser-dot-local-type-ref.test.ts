import { AST } from '@parser/parser'
import { describe, expect, parseAST, test } from './test-utils/test-harness'

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
