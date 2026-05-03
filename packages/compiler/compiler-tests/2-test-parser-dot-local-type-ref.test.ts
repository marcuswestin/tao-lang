import { describe, parseAST, test } from './test-utils/test-harness'

describe('dot-local type ref (Phase 2):', () => {
  test('`.Title "x"` parses as TypedLiteralExpression with DotLocalTypeRef', async () => {
    const doc = await parseAST(`
      view Badge Title is text { }
      view Root {
        Badge .Title "x"
      }
    `)
    doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender.argumentList.arguments[0]
      .as_TypedLiteralExpression.match({
        type: { $type: 'DotLocalTypeRef', name: 'Title' },
      })
  })

  test('`.Count 42` parses with number value', async () => {
    const doc = await parseAST(`
      view Counter Count is number { }
      view Root {
        Counter .Count 42
      }
    `)
    doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender.argumentList.arguments[0]
      .as_TypedLiteralExpression.match({
        type: { $type: 'DotLocalTypeRef' },
        value: { $type: 'NumberLiteral', number: 42 },
      })
  })

  test('`.Person { Name "Ro" }` parses with object literal value', async () => {
    const doc = await parseAST(`
      type PersonData is { Name text }
      view Profile Person is PersonData { }
      view Root {
        Profile .Person { Name "Ro" }
      }
    `)
    doc.statements[2].as_ViewDeclaration.block.statements.first.as_ViewRender.argumentList.arguments[0]
      .as_TypedLiteralExpression.match({
        type: { $type: 'DotLocalTypeRef' },
        value: { $type: 'ObjectLiteral' },
      })
  })

  test('multiple dot-local args parse: `.Title "x", .Subtitle "y"`', async () => {
    const doc = await parseAST(`
      view Badge Title is text, Subtitle is text { }
      view Root {
        Badge .Title "x", .Subtitle "y"
      }
    `)
    doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender.argumentList.arguments.match([
      { $type: 'TypedLiteralExpression', type: { $type: 'DotLocalTypeRef' } },
      { $type: 'TypedLiteralExpression', type: { $type: 'DotLocalTypeRef' } },
    ])
  })
})
