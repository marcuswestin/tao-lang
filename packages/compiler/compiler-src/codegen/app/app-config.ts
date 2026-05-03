/** TaoAppConfigObject is one nested app config object; leaves are untyped strings from Tao source or CLI overrides. */
export type TaoAppConfigObject = { [key: string]: TaoAppConfigValue }

/** TaoAppConfigValue is one app config leaf or nested config object. */
export type TaoAppConfigValue = string | TaoAppConfigObject

/** TaoAppConfig is the normalized app config root. */
export type TaoAppConfig = { app: TaoAppConfigObject }

/** parseAppConfigAssignment parses `path.to.key=value` into a nested app config object. */
export function parseAppConfigAssignment(assignment: string): TaoAppConfig {
  const eq = assignment.indexOf('=')
  if (eq <= 0) {
    throw new Error(`Invalid app config override '${assignment}'. Expected key=value.`)
  }
  return appConfigFromPathValue(assignment.slice(0, eq), assignment.slice(eq + 1))
}

/** appConfigFromPathValue creates a nested app config object from a dot path and config value. */
export function appConfigFromPathValue(path: string, value: TaoAppConfigValue): TaoAppConfig {
  const segments = path.split('.').filter(Boolean)
  if (segments[0] === 'app') {
    segments.shift()
  }
  if (segments.length === 0) {
    throw new Error(`Invalid app config path '${path}'.`)
  }
  const app: TaoAppConfigObject = {}
  let cursor = app
  for (const segment of segments.slice(0, -1)) {
    const next: TaoAppConfigObject = {}
    cursor[segment] = next
    cursor = next
  }
  cursor[segments[segments.length - 1]!] = value
  return { app }
}

/** mergeTaoAppConfig returns `base` with `override` recursively merged over it. */
export function mergeTaoAppConfig(base: TaoAppConfig, override: TaoAppConfig): TaoAppConfig {
  return { app: mergeAppConfigObject(base.app, override.app) }
}

/** normalizeTaoAppConfigObject expands dotted override keys into nested app config objects. */
export function normalizeTaoAppConfigObject(config: TaoAppConfigObject): TaoAppConfigObject {
  let out: TaoAppConfigObject = {}
  for (const [key, value] of Object.entries(config)) {
    const normalizedValue = isAppConfigObject(value) ? normalizeTaoAppConfigObject(value) : value
    const next = key.includes('.')
      ? appConfigFromPathValue(key, normalizedValue).app
      : { [key]: normalizedValue }
    out = mergeAppConfigObject(out, next)
  }
  return out
}

/** mergeAppConfigObject returns `base` with `override` recursively merged over it. */
export function mergeAppConfigObject(
  base: TaoAppConfigObject,
  override: TaoAppConfigObject,
): TaoAppConfigObject {
  const out: TaoAppConfigObject = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key]
    out[key] = isAppConfigObject(existing) && isAppConfigObject(value)
      ? mergeAppConfigObject(existing, value)
      : value
  }
  return out
}

/** isAppConfigObject returns true for nested app config values. */
export function isAppConfigObject(value: TaoAppConfigValue | undefined): value is TaoAppConfigObject {
  return typeof value === 'object' && value !== null
}
