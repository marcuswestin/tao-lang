import { describe, expect, expectParseHasHumanErrors, parseAST, test } from './test-utils/test-harness'

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
    void render.argumentList.arguments[0].as_MemberAccessExpression
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
    alias.value.as_ObjectLiteral.properties.match([{ name: 'x', value: { $type: 'NumberLiteral', number: 1 } }])
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
    void inner2w.as_ObjectLiteral
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
    await expectParseHasHumanErrors(`
      view V {
        alias E = { }
      }
    `)
  })

  test('object literal in alias value position parses as ObjectLiteral AST', async () => {
    const doc = await parseAST(`
      view V {
        alias O = { a 1 }
      }
    `)
    doc.statements.first.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value.match({
      $type: 'ObjectLiteral',
    })
  })
})
