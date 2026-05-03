import { describe, expect, expectParseHasHumanErrors, parseAST, test } from './test-utils/test-harness'

describe('ObjectLiteral vs Block grammar invariant', () => {
  test('alias value `{ x 1 }` is an ObjectLiteral, not a Block', async () => {
    const doc = await parseAST(`
      view V {
        alias O = { x 1 }
      }
    `)
    doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value.match({
      $type: 'ObjectLiteral',
    })
  })

  test('state initializer `{ x 1 }` is an ObjectLiteral, not a Block', async () => {
    const doc = await parseAST(`
      view V {
        state S = { x 1 }
      }
    `)
    doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value.match({
      $type: 'ObjectLiteral',
    })
  })

  test('view body `{}` is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`view V { }`)
    doc.statements.first.as_ViewDeclaration.block.match({ $type: 'Block' })
  })

  test('action body `{}` is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`
      view V {
        action A { }
      }
    `)
    doc.statements.first.as_ViewDeclaration.block.statements.first.as_ActionDeclaration.block.match({ $type: 'Block' })
  })

  test('inline action expression body is a Block, not an ObjectLiteral', async () => {
    const doc = await parseAST(`
      view Btn Title text, OnPress action { }
      view V {
        Btn "t", action { }
      }
    `)
    const render = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
    render.argumentList.arguments[1].as_ActionExpression.block.match({ $type: 'Block' })
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
    expect(render.unwrap().view.$refText).toBe('Inner')
    expect(render.unwrap().argumentList).toBeUndefined()
    render.block.statements.only.match({ $type: 'ViewRender' })
  })

  test('object-literal-shaped content `{ x 1 }` in a view body does not parse as an ObjectLiteral', async () => {
    await expectParseHasHumanErrors(`
      view V {
        x 1
      }
    `)
  })

  test('object-literal-shaped content in an inline action body does not parse as an ObjectLiteral', async () => {
    await expectParseHasHumanErrors(`
      view Btn Title text, OnPress action { }
      view V {
        Btn "t", action { x 1 }
      }
    `)
  })
})
