import { describe, expect, expectParseHasHumanErrors, parseAST, test } from './test-utils/test-harness'

describe('layout syntax parser:', () => {
  test('parses empty layout clause', async () => {
    const doc = await parseAST(`
      layout Row { }
      ui Root {
        Row []
      }
    `)

    const render = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
    expect(render.layoutClause.entries).toHaveLength(0)
  })

  test('parses no-arg render with layout clause', async () => {
    const doc = await parseAST(`
      layout Row { }
      ui Root {
        Row [items top left]
      }
    `)

    const render = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
    const clause = render.layoutClause
    clause.entries.match([{ terms: [{ value: 'items' }, { value: 'top' }, { value: 'left' }] }])
  })

  test('parses render with args and layout clause', async () => {
    const doc = await parseAST(`
      ui Button Title text, Action action { }
      action Save { }
      ui Root {
        Button "Save", Save [width 120, height 44]
      }
    `)

    const render = doc.statements[2].as_ViewDeclaration.block.statements.first.as_ViewRender
    const entries = render.layoutClause.entries
    entries.first.terms.match([{ value: 'width' }, { value: 120 }])
    entries.second.terms.match([{ value: 'height' }, { value: 44 }])
  })

  test('parses render with layout clause before block', async () => {
    const doc = await parseAST(`
      layout Col { }
      ui Text Value text { }
      ui Root {
        Col [gap 8] {
          Text "child" [aligned center]
        }
      }
    `)

    const col = doc.statements[2].as_ViewDeclaration.block.statements.first.as_ViewRender
    col.layoutClause.entries.first.terms.match([{ value: 'gap' }, { value: 8 }])
    const text = col.block.statements.first.as_ViewRender
    text.layoutClause.entries.first.terms.match([{ value: 'aligned' }, { value: 'center' }])
  })

  test('parses multiline layout clause', async () => {
    const doc = await parseAST(`
      layout Row { }
      ui Root {
        Row [
          items center spread,
          gap 12
        ]
      }
    `)

    const entries = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
      .layoutClause.entries
    expect(entries).toHaveLength(2)
    entries.first.terms.match([{ value: 'items' }, { value: 'center' }, { value: 'spread' }])
    entries.second.terms.match([{ value: 'gap' }, { value: 12 }])
  })

  test('parses MVP layout words with hyphenated items and dimension clauses', async () => {
    const doc = await parseAST(`
      layout Row { }
      ui Root {
        Row [items spread-inset, width fill max 400, pad 10 horizontal 4]
      }
    `)

    const entries = doc.statements.second.as_ViewDeclaration.block.statements.first.as_ViewRender
      .layoutClause.entries
    expect(entries).toHaveLength(3)
    entries.first.terms.match([{ value: 'items' }, { value: 'spread-inset' }])
    entries.second.terms.match([{ value: 'width' }, { value: 'fill' }, { value: 'max' }, { value: 400 }])
    entries[2].terms.match([{ value: 'pad' }, { value: 10 }, { value: 'horizontal' }, { value: 4 }])
  })

  test('reports malformed layout clause', async () => {
    const report = await expectParseHasHumanErrors(`
      layout Row { }
      ui Root {
        Row [gap 8,,]
      }
    `)

    expect(report.errorCount()).toBeGreaterThan(0)
  })
})
