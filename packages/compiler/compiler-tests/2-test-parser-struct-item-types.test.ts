import { AST } from '@parser/parser'
import { describe, expect, parseAST, test } from './test-utils/test-harness'

describe('struct/item types', () => {
  test('parses `type Person is { Name text, Age number }` flat struct declaration', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V { }
    `)
    const decl = doc.statements.first.as_TypeDeclaration
    decl.expect('name').toBe('Person')
    const struct = decl.unwrap().base
    expect(AST.isStructTypeExpression(struct)).toBe(true)
    if (AST.isStructTypeExpression(struct)) {
      expect(struct.fields).toHaveLength(2)
      expect(struct.fields[0]?.name).toBe('Name')
      expect(struct.fields[1]?.name).toBe('Age')
      expect(AST.isPrimitiveTypeRef(struct.fields[0]!.type)).toBe(true)
      expect(AST.isPrimitiveTypeRef(struct.fields[1]!.type)).toBe(true)
    }
  })

  test('parses nested struct field declaration `Job { Title text }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view V { }
    `)
    const struct = doc.statements.first.as_TypeDeclaration.unwrap().base
    if (!AST.isStructTypeExpression(struct)) {
      throw new Error('expected struct base')
    }
    const jobField = struct.fields[1]!
    expect(jobField.name).toBe('Job')
    expect(AST.isStructTypeExpression(jobField.type)).toBe(true)
    if (AST.isStructTypeExpression(jobField.type)) {
      expect(jobField.type.fields).toHaveLength(1)
      expect(jobField.type.fields[0]?.name).toBe('Title')
    }
  })

  test('parses typed struct literal `Person { Name "Ro", Age 40 }`', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Age number }
      view V {
        alias Ro = Person { Name "Ro", Age 40 }
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const val = alias.unwrap().value
    expect(AST.isTypedLiteralExpression(val)).toBe(true)
    if (AST.isTypedLiteralExpression(val) && AST.isNamedTypeRef(val.type)) {
      expect(val.type.ref.$refText).toBe('Person')
      expect(AST.isObjectLiteral(val.value)).toBe(true)
    }
  })

  test('parses parameter typed by a declared struct type', async () => {
    const doc = await parseAST(`
      type Person is { Name text }
      view Profile P Person { }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const param = view.unwrap().parameterList!.parameters[0]!
    expect(param.name).toBe('P')
    expect(AST.isNamedTypeRef(param.type)).toBe(true)
    if (AST.isNamedTypeRef(param.type)) {
      expect(param.type.ref?.$refText).toBe('Person')
      expect(param.type.segments).toEqual([])
    }
  })

  test('parses nested type reference `Person.Job` in parameter position', async () => {
    const doc = await parseAST(`
      type Person is { Name text, Job { Title text } }
      view ShowJob J Person.Job { }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const param = view.unwrap().parameterList!.parameters[0]!
    expect(AST.isNamedTypeRef(param.type)).toBe(true)
    if (AST.isNamedTypeRef(param.type)) {
      expect(param.type.ref?.$refText).toBe('Person')
      expect(param.type.segments).toEqual(['Job'])
    }
  })
})
