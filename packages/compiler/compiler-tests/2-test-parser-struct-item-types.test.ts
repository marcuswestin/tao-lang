import { describe, parseAST, test } from './test-utils/test-harness'

describe('struct/item types', () => {
  test('parses `type Person is { Name text, Age number }` flat struct declaration', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V { }
    `)
    const decl = doc.statements.first.as_TypeDeclaration
    decl.expect('name').toBe('Person')
    decl.base.as_StructTypeExpression.fields.match([
      { name: 'Name', type: { $type: 'PrimitiveTypeRef', primitive: 'text' } },
      { name: 'Age', type: { $type: 'PrimitiveTypeRef', primitive: 'number' } },
    ])
  })

  test('parses nested struct field declaration `Job { Title text }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view V { }
    `)
    doc.statements.first.as_TypeDeclaration.base.as_StructTypeExpression.fields[1].match({
      name: 'Job',
      type: {
        $type: 'StructTypeExpression',
        fields: [{ name: 'Title', type: { $type: 'PrimitiveTypeRef' } }],
      },
    })
  })

  test('parses typed struct literal `Person { Name "Ro", Age 40 }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V {
        alias Ro = Person { Name "Ro", Age 40 }
      }
    `)
    doc.statements.second.as_ViewDeclaration.block.statements.first.as_AssignmentDeclaration.value
      .as_TypedLiteralExpression.match({
        type: { ref: { $refText: 'Person' } },
        value: { $type: 'ObjectLiteral' },
      })
  })

  test('parses parameter typed by a declared struct type', async () => {
    const doc = await parseAST(`
      type Person is { Name text }
      view Profile P Person { }
    `)
    doc.statements.second.as_ViewDeclaration.parameterList.parameters[0].match({
      name: 'P',
      type: { ref: { $refText: 'Person' }, segments: [] },
    })
  })

  test('parses nested type reference `Person.Job` in parameter position', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view ShowJob J Person.Job { }
    `)
    doc.statements.second.as_ViewDeclaration.parameterList.parameters[0].match({
      type: { ref: { $refText: 'Person' }, segments: ['Job'] },
    })
  })
})
