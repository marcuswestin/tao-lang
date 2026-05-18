import { describe, expect, test } from '@jest/globals'
import { Layout } from '../../tao-std-lib/tao/tao-runtime/Layout'

describe('layout resolver:', () => {
  test('applies standard container defaults and clipping', () => {
    expect(Layout.resolve({ view: 'Row', entries: [] })).toMatchObject({
      alignItems: 'baseline',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'Col', entries: [] })).toMatchObject({
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'Box', entries: [] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'Stack', entries: [] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })

    expect(Layout.resolve({ view: 'WrappingRow', entries: [] })).toMatchObject({
      alignItems: 'baseline',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    })
  })

  test('normalizes item slots for current spread and center syntax', () => {
    expect(Layout.resolve({ view: 'Row', entries: [['items', 'top', 'spread']] })).toMatchObject({
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    })

    expect(Layout.resolve({ view: 'Row', entries: [['items', 'spread-inset', 'top']] })).toMatchObject({
      alignItems: 'flex-start',
      justifyContent: 'space-around',
    })

    expect(Layout.resolve({ view: 'Col', entries: [['items', 'spread-balanced', 'right']] })).toMatchObject({
      alignItems: 'flex-end',
      justifyContent: 'space-evenly',
    })

    expect(Layout.resolve({ view: 'Box', entries: [['items', 'center', 'left']] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'flex-start',
    })

    expect(Layout.resolve({ view: 'Stack', entries: [['items', 'center']] })).toMatchObject({
      alignItems: 'center',
      justifyContent: 'center',
    })
  })

  test('lowers self alignment, pressure, and dimension fills by parent direction', () => {
    expect(Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['aligned', 'center']] })).toMatchObject({
      alignSelf: 'center',
    })

    expect(Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['width', 'fill']] })).toMatchObject({
      flexGrow: 1,
    })

    expect(Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['height', 'fill']] })).toMatchObject({
      alignSelf: 'stretch',
    })

    expect(Layout.resolve({ view: 'Text', parentDirection: 'column', entries: [['width', 'fill']] })).toMatchObject({
      alignSelf: 'stretch',
    })

    expect(Layout.resolve({ view: 'Text', parentDirection: 'column', entries: [['height', 'fill']] })).toMatchObject({
      flexGrow: 1,
    })

    expect(
      Layout.resolve({ view: 'Text', parentDirection: 'row', entries: [['width', 'fill', 'max', 400]] }),
    ).toMatchObject({
      flexGrow: 1,
      maxWidth: 400,
    })

    expect(Layout.resolve({ view: 'Text', entries: [['fill'], ['rigid']] })).toMatchObject({
      alignSelf: 'stretch',
      flexGrow: 1,
      flexShrink: 0,
    })

    expect(Layout.resolve({ view: 'Text', entries: [['grow', 2], ['compress']] })).toMatchObject({
      flexGrow: 2,
      flexShrink: 1,
    })
  })

  test('resolves padding entries and merged layout entry sets', () => {
    expect(Layout.resolve({ view: 'Row', entries: [['pad', 10, 'horizontal', 4]] })).toMatchObject({
      paddingBottom: 10,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 10,
    })

    expect(Layout.resolve({ view: 'Row', entries: [['pad', 'top', 10, 'bottom', 20, 'horizontal', 40]] }))
      .toMatchObject({
        paddingBottom: 20,
        paddingLeft: 40,
        paddingRight: 40,
        paddingTop: 10,
      })

    expect(
      Layout.resolveMerged({
        view: 'Box',
        entrySets: [
          [['pad', 8], ['rigid'], ['hug']],
          [['pad', 'horizontal', 4], ['compress'], ['fill']],
        ],
      }),
    ).toMatchObject({
      alignSelf: 'stretch',
      flexGrow: 1,
      flexShrink: 1,
      paddingBottom: 8,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 8,
    })
  })
})
