import { AST } from '@parser/parser'
import { describe, expect, resolveReferences, test } from './test-utils/test-harness'

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
