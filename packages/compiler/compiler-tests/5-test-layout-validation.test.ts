import { expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, expectParseHasHumanErrors, parseTaoFully, test } from './test-utils/test-harness'

const BASE_VIEWS = `
  layout Row { }
  layout Col { }
  frame Box { }
  frame Stack { }
  layout WrappingRow { }
  ui Panel { }
  ui Text Value text { }
`

describe('layout validation:', () => {
  test('rejects empty layout clause', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row []
      }
    `)

    expectHumanMessagesContain(report, 'Layout clauses must contain at least one layout entry.')
  })

  test('accepts MVP container and self layout in known Row parent', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      ui Root {
        Row [items top spread, gap 8, pad 10 horizontal 4] {
          Text "Name" [aligned center, width 120]
        }
      }
    `)
  })

  test('accepts standard container item defaults and spread variants', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      ui Root {
        Row [items center]
        Row [items spread-inset top]
        Row [items spread-balanced bottom]
        Col [items spread right]
        Col [items stretch bottom]
        Box [items center left]
        Stack [items top center]
        WrappingRow [items baseline left]
      }
    `)
  })

  test('accepts MVP size and pressure combinations', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      ui Root {
        Row {
          Text "A" [width fill max 400, height hug, grow, compress]
          Text "B" [width 50%, height min 20 max 80, grow 2, rigid]
          Text "C" [fill, rigid]
        }
      }
    `)
  })

  test('rejects layout entry that does not start with a layout word', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [8]
      }
    `)

    expectHumanMessagesContain(report, 'Layout entries must start with a layout word.')
  })

  test('rejects unknown layout words', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [mystery]
      }
    `)

    expectHumanMessagesContain(report, "Unknown layout word 'mystery'.")
  })

  test('rejects duplicate scalar layout properties', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [width 100, width 200]
      }
    `)

    expectHumanMessagesContain(report, "Duplicate layout property 'width'.")
  })

  test('rejects duplicate MVP scalar properties', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [items top, items left, gap 4, gap 8, pad 4, pad 8]
      }
    `)

    expectHumanMessagesContain(report, "Duplicate layout property 'items'.")
    expectHumanMessagesContain(report, "Duplicate layout property 'gap'.")
    expectHumanMessagesContain(report, "Duplicate layout property 'pad'.")
  })

  test('rejects child item slot conflicts after resolving Row axis', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [items left right]
      }
    `)

    expectHumanMessagesContain(report, "Layout item 'right' conflicts with 'left' on the horizontal slot.")
  })

  test('rejects malformed item combinations', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Col [items baseline left]
        Row [items stretch top]
        Row [items top left center]
      }
    `)

    expectHumanMessagesContain(report, "Layout item 'baseline' is not valid in a column container.")
    expectHumanMessagesContain(report, "Layout item 'top' conflicts with 'stretch' on the vertical slot.")
    expectHumanMessagesContain(report, "Layout item 'center' has no empty slot to fill.")
  })

  test('rejects items when container direction is unknown', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Panel [items center]
      }
    `)

    expectHumanMessagesContain(report, "Layout 'items' requires a standard Row/Col/Box/Stack/WrappingRow container")
  })

  test('rejects styling words inside layout', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [color primary]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'color' belongs to styling, not layout.")
  })

  test('rejects deferred React Native layout props', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [aspect_ratio 1]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'aspect_ratio' is not supported in the layout MVP.")
  })

  test('rejects self layout without a parent axis', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Text "Label" [aligned center]
      }
    `)

    expectHumanMessagesContain(report, "Self layout 'aligned' requires a Row/Col/Box/Stack/WrappingRow parent.")
  })

  test('rejects invalid aligned values for the parent direction', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row {
          Text "Label" [aligned left]
          Text "Other" [aligned stretch]
        }
      }
    `)

    expectHumanMessagesContain(report, "Self layout 'aligned left' is not valid in a row parent.")
    expectHumanMessagesContain(report, "Use 'stretched' instead of 'aligned stretch'.")
  })

  test('rejects percent values outside supported range', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Box [width 120%]
      }
    `)

    expectHumanMessagesContain(report, "Layout property 'width' percent values must be between 0 and 100.")
  })

  test('rejects negative values for non-negative layout properties', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [gap -5]
      }
    `)

    expectHumanMessagesContain(report, "Layout property 'gap' does not allow negative values.")
  })

  test('rejects percent values for spacing', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [pad 10%]
      }
    `)

    expectHumanMessagesContain(report, "Malformed layout entry 'pad 10%'.")
  })

  test('rejects min width greater than max width', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Box [width min 200 max 100]
      }
    `)

    expectHumanMessagesContain(report, "Layout 'width min' cannot be greater than 'width max'.")
  })

  test('rejects size and pressure conflicts', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row {
          Text "A" [fill, width 320]
          Text "B" [hug, height 44]
          Text "C" [compress, rigid]
          Text "D" [stretched, height hug]
        }
      }
    `)

    expectHumanMessagesContain(report, "Layout 'fill' cannot appear with 'width' or 'height' in the same clause.")
    expectHumanMessagesContain(report, "Layout 'hug' cannot appear with 'width' or 'height' in the same clause.")
    expectHumanMessagesContain(report, "Layout 'compress' conflicts with 'rigid'.")
    expectHumanMessagesContain(report, "Layout 'stretched' conflicts with cross-axis 'hug'.")
  })

  test('allows aligned plus cross-axis hug without stretched conflict', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      ui Root {
        Row {
          Text "Label" [aligned center, height hug]
        }
      }
    `)
  })

  test('rejects legacy layout words directly', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [centered]
        Row [packed]
        Row [wrap]
        Row [margin 8]
        Row [absolute]
        Row [row_gap 8]
        Row [around]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'centered' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'packed' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'wrap' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'margin' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'absolute' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'row_gap' is not supported in the layout MVP.")
    expectHumanMessagesContain(report, "Layout word 'around' is not supported in the layout MVP.")
  })

  test('rejects item words outside items entries', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      ui Root {
        Row [top]
        Row [spread]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'top' must be used inside an 'items' entry.")
    expectHumanMessagesContain(report, "Layout word 'spread' must be used inside an 'items' entry.")
  })
})
