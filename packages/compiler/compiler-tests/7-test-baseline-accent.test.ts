import { selectTaoBaselineAccent, TAO_BASELINE_ACCENT_NAMES } from '@compiler/design/baseline-accent'
import { describe, expect, test } from 'bun:test'

describe('selectTaoBaselineAccent:', () => {
  test('returns one of the curated accent names', () => {
    const accent = selectTaoBaselineAccent('AnyApp')
    expect(TAO_BASELINE_ACCENT_NAMES).toContain(accent)
  })

  test('is deterministic for the same seed', () => {
    const first = selectTaoBaselineAccent('LaunchReadinessDashboard')
    const second = selectTaoBaselineAccent('LaunchReadinessDashboard')
    expect(first).toBe(second)
  })

  test('produces multiple distinct accents across varied seeds', () => {
    const seeds = [
      'AlphaApp',
      'BetaApp',
      'CompactNotes',
      'LaunchReadinessDashboard',
      'QuietCraft',
      'CrispOperations',
      'ExpressiveProduct',
      'StillFocus',
      'RoomsChat',
      'KitchenSink',
    ]
    const accents = new Set(seeds.map(selectTaoBaselineAccent))
    expect(accents.size).toBeGreaterThanOrEqual(3)
  })

  test('exposes exactly six curated accents', () => {
    expect(TAO_BASELINE_ACCENT_NAMES.length).toBe(6)
  })
})
