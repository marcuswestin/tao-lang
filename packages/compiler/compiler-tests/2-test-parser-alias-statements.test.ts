import { decodeTaoTemplateTextChunk } from '@compiler/codegen/tao-template-text-chunk'
import { AST } from '@parser/parser'
import { describe, expect, parseAST, parseASTWithErrors, test } from './test-utils/test-harness'

describe('alias statements', () => {
  test('top-level alias', async () => {
    const doc = await parseAST(`
      alias Pi = 3
      view MyView { }
    `)
    const alias = doc.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Pi')
    alias.value.as_NumberLiteral.expect('number').toBe(3)
  })

  test('alias with number literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Age = 1
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Age')
    alias.value.as_NumberLiteral.expect('number').toBe(1)
  })

  test('alias with string literal', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Greeting = "hello"
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    alias.expect('name').toBe('Greeting')
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    expect(tmpl.segments[0]?.text).toBe('hello')
  })

  test('multiple aliases in a view', async () => {
    const doc = await parseAST(`
      view MyView {
        alias Name = "world"
        alias Count = 42
      }
    `)
    const view = doc.statements.first.as_ViewDeclaration
    const first = view.block.statements.first.as_AssignmentDeclaration
    first.expect('name').toBe('Name')
    const tmpl = first.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    expect(tmpl.segments[0]?.text).toBe('world')
    const second = view.block.statements.second.as_AssignmentDeclaration
    second.expect('name').toBe('Count')
    second.value.as_NumberLiteral.expect('number').toBe(42)
  })

  test('string template parses ${…} as AST expression segments (not post-processed text)', async () => {
    // Use normal string concat so Tao source contains real `${` (nested template literals can leave a `\\` before `$`).
    const doc = await parseAST(
      ['view MyView {', '  state N = 1', '  alias Msg = "a ${N} b"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.second.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(3)
    expect(tmpl.segments[0]?.text).toBe('a ')
    expect(tmpl.segments[1]?.expression).toBeDefined()
    expect(AST.isMemberAccessExpression(tmpl.segments[1]!.expression!)).toBe(true)
    expect(tmpl.segments[2]?.text).toBe(' b')
  })

  test('string template interpolation accepts an object literal expression', async () => {
    // Object literals inside `${…}` exercise the `{` / `}` clones in the interp lexer mode
    // (BraceOpenInterp / BraceCloseInterp with CATEGORIES pointing at the original keywords).
    const doc = await parseAST(
      ['view MyView {', '  alias Msg = "x ${ { a 1 } } y"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(3)
    expect(tmpl.segments[0]?.text).toBe('x ')
    expect(tmpl.segments[1]?.expression).toBeDefined()
    expect(AST.isObjectLiteral(tmpl.segments[1]!.expression!)).toBe(true)
    expect(tmpl.segments[2]?.text).toBe(' y')
  })

  test('nested string templates are rejected (deferred feature)', async () => {
    // `STRING_START` is intentionally excluded from the `interp` mode token list, so an inner `"` inside `${…}`
    // fails at the lexer and then the parser. This is the gate for the deferred nested-template feature.
    const report = await parseASTWithErrors(
      ['view MyView {', '  alias Msg = "a ${ "b" } c"', '}'].join('\n'),
    )
    expect(report.hasError()).toBe(true)
  })

  test('view parameter is in scope inside ${…}', async () => {
    // This is the scope case the post-parse reify approach could not handle (parameters were not included in the
    // synthetic prefix). Under the multi-mode lexer, the interpolation is part of the host CST so the parameter
    // resolves through the normal Langium scope chain.
    const doc = await parseAST(
      ['view Greeting Name text {', '  alias M = "Hi ${Name}"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    const segExpr = tmpl.segments[1]?.expression
    expect(segExpr).toBeDefined()
    expect(AST.isMemberAccessExpression(segExpr!)).toBe(true)
  })

  test('string template preserves raw escape sequences in segment text, and decoder unescapes them', async () => {
    // The lexer captures the raw slice (e.g. `a\\nb`) and the codegen decoder (`decodeTaoTemplateTextChunk`) is
    // responsible for turning `\n`, `\t`, `\"`, `\\`, `\$`, `\r` into their unescaped characters. This test pins
    // down both sides of that contract (raw-text preserved at parse time, decoder produces expected output).
    const doc = await parseAST(
      ['view V {', '  alias M = "a\\nb\\tc\\\\d\\"e\\$f"', '}'].join('\n'),
    )
    const view = doc.statements.first.as_ViewDeclaration
    const alias = view.block.statements.first.as_AssignmentDeclaration
    const tmpl = alias.value.as_StringTemplateExpression.unwrap()
    expect(tmpl.segments).toHaveLength(1)
    const raw = tmpl.segments[0]?.text
    expect(raw).toBe('a\\nb\\tc\\\\d\\"e\\$f')
    expect(decodeTaoTemplateTextChunk(raw!)).toBe('a\nb\tc\\d"e$f')
  })

  test('alias alongside view render statements', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view MyView {
        alias Msg = "hi"
        Text "hello"
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    view.block.statements.first.as_AssignmentDeclaration.expect('name').toBe('Msg')
    const st = view.unwrap().block.statements[1]
    expect(AST.isViewRender(st)).toBe(true)
    expect((st as AST.ViewRender).view?.ref?.name).toBe('Text')
  })

  test('identifier reference in argument', async () => {
    const doc = await parseAST(`
      view Text Value text { }
      view MyView {
        alias Msg = "hi"
        Text Msg
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const render = view.block.statements.second.as_ViewRender
    const arg = render.argumentList!.arguments[0]!
    expect(AST.isMemberAccessExpression(arg)).toBe(true)
  })

  test('alias in nested view body', async () => {
    const doc = await parseAST(`
      view Container { }
      view MyView {
        Container {
          alias Nested = 99
        }
      }
    `)
    const view = doc.statements.second.as_ViewDeclaration
    const container = view.block.statements.first.as_ViewRender
    const nestedAlias = container.block.statements.first.as_AssignmentDeclaration
    nestedAlias.expect('name').toBe('Nested')
    nestedAlias.value.as_NumberLiteral.expect('number').toBe(99)
  })
})
