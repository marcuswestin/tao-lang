export const TAO_EXT = '.tao'

/** sanitizeCompiledScenarioOutputSegment returns a filesystem-safe lowercase slug for scenario names (e.g. compiled test app dirs). */
export function sanitizeCompiledScenarioOutputSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}
