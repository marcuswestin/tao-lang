import { expectHumanMessagesContain } from './test-utils/diagnostics'
import { describe, expectParseHasHumanErrors, parseTaoFully, test } from './test-utils/test-harness'

const BASE_VIEWS = `
  view Row { }
  view Col { }
  view Box { }
  view Text Value text { }
`

describe('layout validation:', () => {
  test('accepts empty layout clause', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      view Root {
        Row []
      }
    `)
  })

  test('accepts v1 container and self layout in known Row parent', async () => {
    await parseTaoFully(`
      ${BASE_VIEWS}
      view Root {
        Row [top spread, gap 8] {
          Text "Name" [centered, width 120]
        }
      }
    `)
  })

  test('rejects layout entry that does not start with a layout word', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [8]
      }
    `)

    expectHumanMessagesContain(report, 'Layout entries must start with a layout word.')
  })

  test('rejects unknown layout words', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [mystery]
      }
    `)

    expectHumanMessagesContain(report, "Unknown layout word 'mystery'.")
  })

  test('rejects duplicate scalar layout properties', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [width 100, width 200]
      }
    `)

    expectHumanMessagesContain(report, "Duplicate layout property 'width'.")
  })

  test('rejects child axis conflicts after resolving Row axis', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [left right]
      }
    `)

    expectHumanMessagesContain(report, "conflicts with 'left' on the row main axis")
  })

  test('rejects child arrangement when container direction is unknown', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Box [center]
      }
    `)

    expectHumanMessagesContain(report, 'require a Row/Col view or an explicit row/column layout direction')
  })

  test('rejects styling words inside layout', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [color primary]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'color' belongs to styling, not layout.")
  })

  test('rejects deferred React Native layout props', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [aspect_ratio 1]
      }
    `)

    expectHumanMessagesContain(report, "Layout word 'aspect_ratio' is not supported in layout v1.")
  })

  test('rejects self layout without a parent axis', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Text "Label" [centered]
      }
    `)

    expectHumanMessagesContain(report, "Self layout word 'centered' requires")
  })

  test('rejects offsets without position mode', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Box [top 8]
      }
    `)

    expectHumanMessagesContain(report, "Layout offset 'top' requires 'absolute' or 'relative'")
  })

  test('rejects percent values outside supported range', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Box [width 120%]
      }
    `)

    expectHumanMessagesContain(report, "Layout property 'width' percent values must be between 0 and 100.")
  })

  test('rejects negative values for non-negative layout properties', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Row [gap -5]
      }
    `)

    expectHumanMessagesContain(report, "Layout property 'gap' does not allow negative values.")
  })

  test('rejects min width greater than max width', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Box [min_width 200, max_width 100]
      }
    `)

    expectHumanMessagesContain(report, "Layout 'minWidth' cannot be greater than 'maxWidth'.")
  })

  test('rejects width with both left and right offsets', async () => {
    const report = await expectParseHasHumanErrors(`
      ${BASE_VIEWS}
      view Root {
        Box [absolute, width 320, left 8, right 8]
      }
    `)

    expectHumanMessagesContain(report, "Layout 'width' conflicts with both 'left' and 'right' offsets.")
  })
})
