import { defined, describe, expect, parseAST, test } from './test-utils/test-harness'

describe('local parameter types (Phase 1):', () => {
  test('view Badge Title is text parses with localSuperType', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
    `)
    const p0 = doc.statements.first.as_ViewDeclaration.parameterList.parameters[0]
    p0.match({
      name: 'Title',
      localSuperType: { primitive: 'text', $type: 'PrimitiveTypeRef' },
    })
    expect(p0.unwrap().type).toBeUndefined()
  })

  test('view with multiple local types parses correctly', async () => {
    const doc = await parseAST(`
      view Button Title is text, Action is action { }
    `)
    doc.statements.first.as_ViewDeclaration.parameterList.parameters.match([
      { name: 'Title', localSuperType: defined },
      { name: 'Action', localSuperType: defined },
    ])
  })

  test('mixed local and explicit params parse correctly', async () => {
    const doc = await parseAST(`
      view Card Title is text, Size number { }
    `)
    const params = doc.statements.first.as_ViewDeclaration.parameterList.parameters
    params.match([
      { name: 'Title', localSuperType: defined },
      { name: 'Size', type: defined },
    ])
    expect(params[0].unwrap().type).toBeUndefined()
    expect(params[1].unwrap().localSuperType).toBeUndefined()
  })

  test('typed literal with dotted constructor head parses as NamedTypeRef with segments', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
      view Root {
        Badge Badge.Title "x"
      }
    `)
    expect(doc.statements.length).toBe(2)
    doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender.argumentList.arguments[0]
      .as_TypedLiteralExpression.match({
        type: { ref: { $refText: 'Badge' }, segments: ['Title'] },
      })
  })
})
