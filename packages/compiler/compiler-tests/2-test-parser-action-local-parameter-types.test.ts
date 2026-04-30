import { AST } from '@parser/parser'
import { SNIPPET_ACTION_BUMP_STEP_NUMBER } from './fixtures/snippets'
import { describe, expect, parseAST, test } from './test-utils/test-harness'

describe('action local parameter types (Phase 3):', () => {
  test('action Bump Step is number parses with localSuperType', async () => {
    const doc = await parseAST(`
      ${SNIPPET_ACTION_BUMP_STEP_NUMBER}
    `)
    const action = doc.statements.first.as_ActionDeclaration
    const param = action.unwrap().parameterList!.parameters[0]!
    expect(param.name).toBe('Step')
    expect(param.localSuperType).toBeDefined()
    expect(param.type).toBeUndefined()
  })

  test('do Bump .Step 3 parses dot shorthand in action call', async () => {
    const doc = await parseAST(`
      ${SNIPPET_ACTION_BUMP_STEP_NUMBER}
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
