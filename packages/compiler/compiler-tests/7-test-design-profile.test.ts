import { selectTaoDesignProfile, taoDesignTemplateForDescription } from '@compiler/design/design-profile'
import { describe, expect, test } from 'bun:test'

describe('selectTaoDesignProfile:', () => {
  test('returns undefined for an empty description', () => {
    expect(selectTaoDesignProfile({ description: '', seed: 'App' })).toBeUndefined()
    expect(selectTaoDesignProfile({ description: '   ', seed: 'App' })).toBeUndefined()
  })

  test('maps mood keywords to distinct templates', () => {
    expect(taoDesignTemplateForDescription('a calm mindful meditation journal')).toBe('Quiet Craft')
    expect(taoDesignTemplateForDescription('a bold playful vibrant streetwear shop')).toBe('Expressive Product')
    expect(taoDesignTemplateForDescription('a finance analytics dashboard for an ops team')).toBe('Crisp Operations')
    expect(taoDesignTemplateForDescription('a cozy warm family recipe box')).toBe('Warm Editorial')
    expect(taoDesignTemplateForDescription('a sleep tracker for late night wind down')).toBe('Nocturne')
  })

  test('is deterministic for the same description and seed', () => {
    const a = selectTaoDesignProfile({ description: 'a calm meditation journal', seed: 'AutoDesignCalm' })
    const b = selectTaoDesignProfile({ description: 'a calm meditation journal', seed: 'AutoDesignCalm' })
    expect(a).toEqual(b)
  })

  test('different briefs produce different palettes and shape', () => {
    const calm = selectTaoDesignProfile({ description: 'a calm meditation journal', seed: 'A' })!
    const bold = selectTaoDesignProfile({ description: 'a bold playful streetwear shop', seed: 'A' })!
    expect(calm.template).not.toBe(bold.template)
    expect(calm.light.accent).not.toBe(bold.light.accent)
    expect(calm.surfaceRadius).not.toBe(bold.surfaceRadius)
  })

  test('produces a full palette for both color schemes', () => {
    const p = selectTaoDesignProfile({ description: 'a bold playful streetwear shop', seed: 'Shop' })!
    for (const scheme of [p.light, p.dark]) {
      expect(scheme.appBackground).toMatch(/^#[0-9a-f]{6}$/)
      expect(scheme.accent).toMatch(/^#[0-9a-f]{6}$/)
      expect(scheme.onAccentText).toMatch(/^#[0-9a-f]{6}$/)
      expect(scheme.accentPressed).toMatch(/^#[0-9a-f]{6}$/)
      expect(scheme.primaryText).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
