import { AST } from '@parser/parser'
import { expectHasHumanErrors } from './test-utils/diagnostics'
import { describe, expect, parseAST, parseASTWithErrors, test } from './test-utils/test-harness'

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
    expectHasHumanErrors(errors)
  })

  test('object-literal-shaped content in an inline action body does not parse as an ObjectLiteral', async () => {
    const errors = await parseASTWithErrors(`
      view Btn Title text, OnPress action { }
      view V {
        Btn "t", action { x 1 }
      }
    `)
    expectHasHumanErrors(errors)
  })
})
