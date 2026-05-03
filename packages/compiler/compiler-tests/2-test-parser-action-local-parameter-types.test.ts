import { SNIPPET_ACTION_BUMP_STEP_NUMBER } from '@shared/testing/tao-snippets'
import { defined, describe, expect, parseAST, test } from './test-utils/test-harness'

describe('action local parameter types (Phase 3):', () => {
  test('action Bump Step is number parses with localSuperType', async () => {
    const doc = await parseAST(`
      ${SNIPPET_ACTION_BUMP_STEP_NUMBER}
    `)
    const p0 = doc.statements.first.as_ActionDeclaration.parameterList.parameters[0]
    p0.match({ name: 'Step', localSuperType: defined })
    expect(p0.unwrap().type).toBeUndefined()
  })

  test('do Bump .Step 3 parses dot shorthand in action call', async () => {
    const doc = await parseAST(`
      ${SNIPPET_ACTION_BUMP_STEP_NUMBER}
      action Use {
        do Bump .Step 3
      }
    `)
    doc.statements.second.as_ActionDeclaration.block.statements.first.as_ActionRender.argumentList.arguments[0]
      .as_TypedLiteralExpression.match({
        type: { $type: 'DotLocalTypeRef', name: 'Step' },
      })
  })
})
