export const TAO_BASELINE_ACCENT_NAMES = ['blue', 'teal', 'green', 'amber', 'rose', 'indigo'] as const
export type TaoBaselineAccentName = (typeof TAO_BASELINE_ACCENT_NAMES)[number]

/** selectTaoBaselineAccent picks one of the six baseline accents deterministically from an app identity string. */
export function selectTaoBaselineAccent(seed: string): TaoBaselineAccentName {
  const hash = fnv1aHash32(seed)
  return TAO_BASELINE_ACCENT_NAMES[hash % TAO_BASELINE_ACCENT_NAMES.length]!
}

function fnv1aHash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
