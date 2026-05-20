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

  test('carries a font family, with a serif for the editorial archetype', () => {
    const editorial = selectTaoDesignProfile({ description: 'a cozy warm family recipe box', seed: 'X' })!
    const ops = selectTaoDesignProfile({ description: 'a finance analytics dashboard for an ops team', seed: 'X' })!
    expect(editorial.fontFamily).toContain('serif')
    expect(ops.fontFamily).not.toBe(editorial.fontFamily)
  })

  test('tone words change corner radius within the same template', () => {
    const loud = selectTaoDesignProfile({ description: 'a bold punchy loud streetwear shop', seed: 'X' })!
    const calm = selectTaoDesignProfile({ description: 'a refined understated muted streetwear shop', seed: 'X' })!
    expect(loud.template).toBe(calm.template)
    expect(loud.surfaceRadius).toBeGreaterThan(calm.surfaceRadius)
  })

  test('density words tighten spacing within the same template', () => {
    const packed = selectTaoDesignProfile({ description: 'a packed efficient compact streetwear shop', seed: 'X' })!
    const airy = selectTaoDesignProfile({ description: 'an airy spacious generous streetwear shop', seed: 'X' })!
    expect(packed.template).toBe(airy.template)
    expect(packed.spacingUnit).toBeLessThan(airy.spacingUnit)
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
