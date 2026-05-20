// Quick-and-dirty "auto design" engine: turn an app's `design { description }` into a full
// runtime design profile (palette, radius, spacing, type) using a deterministic archetype
// heuristic. This stands in for an LLM behind one interface; see prototypes/auto-design-lab.

/** A resolved palette for one color scheme. Field names match the std-lib runtime baseline palette. */
export type TaoDesignProfilePalette = {
  appBackground: string
  surfaceBackground: string
  primaryText: string
  secondaryText: string
  mutedText: string
  border: string
  borderStrong: string
  inputBackground: string
  inputBorder: string
  accent: string
  accentPressed: string
  accentSubtle: string
  onAccentText: string
  placeholder: string
  disabledForeground: string
  disabledBackground: string
  focusRing: string
}

/** A full generated design profile emitted into the app bootstrap and consumed by the runtime design context. */
export type TaoDesignProfile = {
  template: string
  controlRadius: number
  surfaceRadius: number
  spacingUnit: number
  baseFontSize: number
  light: TaoDesignProfilePalette
  dark: TaoDesignProfilePalette
}

type ArchetypeNeutral = {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  inputBg: string
  inputBorder: string
  text: string
  textSoft: string
  textMute: string
}

type ArchetypeAccent = { accent: string; subtle: string; on: string }

type Archetype = {
  name: string
  controlRadius: number
  surfaceRadius: number
  spacingUnit: number
  baseFontSize: number
  neutralLight: ArchetypeNeutral
  neutralDark: ArchetypeNeutral
  accentsLight: ArchetypeAccent[]
  accentsDark: ArchetypeAccent[]
}

type ArchetypeKey = 'quietCraft' | 'crispOps' | 'expressive' | 'warmEditorial' | 'nocturne'

const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  quietCraft: {
    name: 'Quiet Craft',
    controlRadius: 14,
    surfaceRadius: 16,
    spacingUnit: 10,
    baseFontSize: 16,
    neutralLight: {
      bg: '#f6f7f9',
      surface: '#ffffff',
      surfaceAlt: '#f0f2f5',
      border: '#e3e7ec',
      inputBg: '#ffffff',
      inputBorder: '#cdd4dd',
      text: '#1b2330',
      textSoft: '#46505f',
      textMute: '#7a8595',
    },
    neutralDark: {
      bg: '#0e1116',
      surface: '#161b22',
      surfaceAlt: '#1d242d',
      border: '#2a323d',
      inputBg: '#0f141b',
      inputBorder: '#2a323d',
      text: '#eef2f7',
      textSoft: '#c2cad6',
      textMute: '#8b95a4',
    },
    accentsLight: [
      { accent: '#4f46e5', subtle: '#e6e7ff', on: '#ffffff' },
      { accent: '#0f766e', subtle: '#d3f3ee', on: '#ffffff' },
      { accent: '#4d7c0f', subtle: '#e8f3d6', on: '#ffffff' },
    ],
    accentsDark: [
      { accent: '#a5b4fc', subtle: '#312e81', on: '#0b1020' },
      { accent: '#5eead4', subtle: '#134e4a', on: '#04231f' },
      { accent: '#bef264', subtle: '#365314', on: '#1a2406' },
    ],
  },
  crispOps: {
    name: 'Crisp Operations',
    controlRadius: 8,
    surfaceRadius: 10,
    spacingUnit: 7,
    baseFontSize: 15,
    neutralLight: {
      bg: '#f4f5f7',
      surface: '#ffffff',
      surfaceAlt: '#eef0f3',
      border: '#d6dae0',
      inputBg: '#ffffff',
      inputBorder: '#c4cad2',
      text: '#0f172a',
      textSoft: '#3a4659',
      textMute: '#6b7787',
    },
    neutralDark: {
      bg: '#0b0e14',
      surface: '#11161f',
      surfaceAlt: '#171d28',
      border: '#232b38',
      inputBg: '#0c1118',
      inputBorder: '#232b38',
      text: '#f1f5fa',
      textSoft: '#b9c2cf',
      textMute: '#7e8a99',
    },
    accentsLight: [
      { accent: '#2563eb', subtle: '#dbeafe', on: '#ffffff' },
      { accent: '#0e7490', subtle: '#cffafe', on: '#ffffff' },
      { accent: '#475569', subtle: '#e2e8f0', on: '#ffffff' },
    ],
    accentsDark: [
      { accent: '#60a5fa', subtle: '#1e3a8a', on: '#0b1220' },
      { accent: '#22d3ee', subtle: '#164e63', on: '#04222b' },
      { accent: '#94a3b8', subtle: '#1e293b', on: '#0b1220' },
    ],
  },
  expressive: {
    name: 'Expressive Product',
    controlRadius: 22,
    surfaceRadius: 22,
    spacingUnit: 9,
    baseFontSize: 16,
    neutralLight: {
      bg: '#fbf7ff',
      surface: '#ffffff',
      surfaceAlt: '#f4ecff',
      border: '#ece0fb',
      inputBg: '#ffffff',
      inputBorder: '#e0d2f7',
      text: '#1f1235',
      textSoft: '#4b3b66',
      textMute: '#8276a0',
    },
    neutralDark: {
      bg: '#120a1f',
      surface: '#1c1130',
      surfaceAlt: '#261640',
      border: '#38245c',
      inputBg: '#160d26',
      inputBorder: '#38245c',
      text: '#f6eeff',
      textSoft: '#d6c6f0',
      textMute: '#9c8bc0',
    },
    accentsLight: [
      { accent: '#7c3aed', subtle: '#ede9fe', on: '#ffffff' },
      { accent: '#e11d48', subtle: '#ffe4e6', on: '#ffffff' },
      { accent: '#ea580c', subtle: '#ffedd5', on: '#ffffff' },
      { accent: '#059669', subtle: '#d1fae5', on: '#ffffff' },
    ],
    accentsDark: [
      { accent: '#c4b5fd', subtle: '#4c1d95', on: '#1a0b2e' },
      { accent: '#fb7185', subtle: '#881337', on: '#2a0b14' },
      { accent: '#fdba74', subtle: '#7c2d12', on: '#2a1206' },
      { accent: '#6ee7b7', subtle: '#064e3b', on: '#04231a' },
    ],
  },
  warmEditorial: {
    name: 'Warm Editorial',
    controlRadius: 10,
    surfaceRadius: 12,
    spacingUnit: 10,
    baseFontSize: 17,
    neutralLight: {
      bg: '#fbf6ee',
      surface: '#fffdf8',
      surfaceAlt: '#f3ead9',
      border: '#e7d9c2',
      inputBg: '#fffdf8',
      inputBorder: '#ddcdb2',
      text: '#2b211a',
      textSoft: '#5a4a3b',
      textMute: '#8a7762',
    },
    neutralDark: {
      bg: '#1a140d',
      surface: '#221a11',
      surfaceAlt: '#2c2216',
      border: '#3d2f1e',
      inputBg: '#1d160e',
      inputBorder: '#3d2f1e',
      text: '#f6ecdc',
      textSoft: '#d8c6ad',
      textMute: '#a48a6b',
    },
    accentsLight: [
      { accent: '#b45309', subtle: '#fde7c8', on: '#ffffff' },
      { accent: '#9f1239', subtle: '#fbd9e1', on: '#ffffff' },
      { accent: '#4d7c0f', subtle: '#e9f0d3', on: '#ffffff' },
    ],
    accentsDark: [
      { accent: '#fbbf24', subtle: '#78350f', on: '#2a1c06' },
      { accent: '#fb7185', subtle: '#881337', on: '#2a0b12' },
      { accent: '#bef264', subtle: '#365314', on: '#1a2406' },
    ],
  },
  nocturne: {
    name: 'Nocturne',
    controlRadius: 18,
    surfaceRadius: 18,
    spacingUnit: 9,
    baseFontSize: 16,
    neutralLight: {
      bg: '#eef1fb',
      surface: '#ffffff',
      surfaceAlt: '#e7ecfb',
      border: '#dfe4f5',
      inputBg: '#ffffff',
      inputBorder: '#d3daf0',
      text: '#141a2e',
      textSoft: '#46506e',
      textMute: '#7a85a3',
    },
    neutralDark: {
      bg: '#070a14',
      surface: '#0e1424',
      surfaceAlt: '#141d33',
      border: '#1f2b47',
      inputBg: '#0b1120',
      inputBorder: '#1f2b47',
      text: '#eaf0ff',
      textSoft: '#b7c4e0',
      textMute: '#7c8aae',
    },
    accentsLight: [
      { accent: '#6d28d9', subtle: '#ede9fe', on: '#ffffff' },
      { accent: '#0d9488', subtle: '#ccfbf1', on: '#ffffff' },
      { accent: '#2563eb', subtle: '#dbeafe', on: '#ffffff' },
    ],
    accentsDark: [
      { accent: '#a78bfa', subtle: '#3b0764', on: '#0b0820' },
      { accent: '#2dd4bf', subtle: '#0f3d3a', on: '#03201d' },
      { accent: '#60a5fa', subtle: '#1e3a8a', on: '#0a1430' },
    ],
  },
}

const LEXICON: Record<ArchetypeKey, string[]> = {
  quietCraft: [
    'calm',
    'mindful',
    'meditation',
    'meditate',
    'zen',
    'serene',
    'focus',
    'quiet',
    'minimal',
    'simple',
    'breathe',
    'wellness',
    'journal',
    'notes',
    'study',
    'slow',
    'gratitude',
    'habit',
  ],
  crispOps: [
    'dashboard',
    'ops',
    'operations',
    'finance',
    'fintech',
    'banking',
    'analytics',
    'data',
    'admin',
    'enterprise',
    'productivity',
    'task',
    'project',
    'crm',
    'metrics',
    'monitor',
    'status',
    'api',
    'developer',
    'technical',
    'trading',
    'invoice',
    'expense',
    'team',
  ],
  expressive: [
    'bold',
    'playful',
    'fun',
    'vibrant',
    'social',
    'creative',
    'music',
    'party',
    'game',
    'gaming',
    'kids',
    'sports',
    'fitness',
    'energy',
    'street',
    'streetwear',
    'hype',
    'bright',
    'colorful',
    'community',
    'chat',
    'drop',
    'drops',
  ],
  warmEditorial: [
    'recipe',
    'recipes',
    'cooking',
    'food',
    'cozy',
    'warm',
    'home',
    'story',
    'blog',
    'editorial',
    'magazine',
    'travel',
    'photography',
    'wedding',
    'garden',
    'coffee',
    'book',
    'books',
    'craft',
    'premium',
    'elegant',
    'luxury',
    'family',
    'dinner',
  ],
  nocturne: [
    'night',
    'nighttime',
    'sleep',
    'dark',
    'astronomy',
    'stars',
    'dream',
    'nocturne',
    'midnight',
    'cinema',
    'movie',
    'moon',
    'evening',
  ],
}

/** selectTaoDesignProfile maps an app design description to a full generated design profile, or undefined when there is no description. */
export function selectTaoDesignProfile(opts: { description: string; seed: string }): TaoDesignProfile | undefined {
  const description = opts.description.trim()
  if (description === '') {
    return undefined
  }
  const key = analyzeArchetype(description)
  const arch = ARCHETYPES[key]
  const idx = fnv1aHash32(opts.seed) % Math.max(arch.accentsLight.length, 1)
  return {
    template: arch.name,
    controlRadius: arch.controlRadius,
    surfaceRadius: arch.surfaceRadius,
    spacingUnit: arch.spacingUnit,
    baseFontSize: arch.baseFontSize,
    light: paletteFor(arch.neutralLight, arch.accentsLight[idx]!, 'light'),
    dark: paletteFor(arch.neutralDark, arch.accentsDark[idx]!, 'dark'),
  }
}

/** taoDesignTemplateForDescription returns just the chosen template name (useful for diagnostics/tests). */
export function taoDesignTemplateForDescription(description: string): string | undefined {
  const trimmed = description.trim()
  if (trimmed === '') {
    return undefined
  }
  return ARCHETYPES[analyzeArchetype(trimmed)].name
}

function analyzeArchetype(description: string): ArchetypeKey {
  const words = description.toLowerCase().match(/[a-z]+/g) ?? []
  const scores: Record<ArchetypeKey, number> = {
    quietCraft: 0,
    crispOps: 0,
    expressive: 0,
    warmEditorial: 0,
    nocturne: 0,
  }
  for (const word of words) {
    for (const key of Object.keys(LEXICON) as ArchetypeKey[]) {
      if (LEXICON[key].includes(word)) {
        scores[key] += 1
      }
    }
  }
  let best: ArchetypeKey = 'quietCraft'
  let bestScore = -1
  for (const key of Object.keys(scores) as ArchetypeKey[]) {
    if (scores[key] > bestScore) {
      best = key
      bestScore = scores[key]
    }
  }
  // A "night/dark" signal nudges an otherwise-calm brief toward the dark-first look.
  if (scores.nocturne > 0 && best === 'quietCraft') {
    best = 'nocturne'
  }
  return best
}

function paletteFor(n: ArchetypeNeutral, accent: ArchetypeAccent, scheme: 'light' | 'dark'): TaoDesignProfilePalette {
  return {
    appBackground: n.bg,
    surfaceBackground: n.surface,
    primaryText: n.text,
    secondaryText: n.textSoft,
    mutedText: n.textMute,
    border: n.border,
    borderStrong: n.inputBorder,
    inputBackground: n.inputBg,
    inputBorder: n.inputBorder,
    accent: accent.accent,
    accentPressed: scheme === 'light' ? mix(accent.accent, '#000000', 0.14) : mix(accent.accent, '#ffffff', 0.14),
    accentSubtle: accent.subtle,
    onAccentText: accent.on,
    placeholder: n.textMute,
    disabledForeground: n.textMute,
    disabledBackground: n.surfaceAlt,
    focusRing: accent.accent,
  }
}

function fnv1aHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  const c = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * amount)
  return rgbToHex(c(0), c(1), c(2))
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
