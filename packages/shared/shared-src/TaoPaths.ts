/** TAO_EXT is the file extension for Tao source files. */
export const TAO_EXT = '.tao'

/** sanitizeCompiledScenarioOutputSegment returns a filesystem-safe lowercase slug for scenario names (e.g. compiled test app dirs). */
export function sanitizeCompiledScenarioOutputSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

/** compiledScenarioTaoAppBootstrapRelativePath returns `test-<slug>/tao-app/app-bootstrap.tsx` for a scenario display name. */
export function compiledScenarioTaoAppBootstrapRelativePath(scenarioName: string) {
  return `test-${sanitizeCompiledScenarioOutputSegment(scenarioName)}/tao-app/app-bootstrap.tsx`
}
