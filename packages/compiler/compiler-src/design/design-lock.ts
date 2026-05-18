import { FS } from '@shared'
import { createHash } from '@shared/crypto'

export const TAO_DESIGN_LOCK_FILE = 'tao.design.lock'
export const TAO_DESIGN_SUGGESTION_LOCK_FILE = '.tao.design.lock'
export const TAO_DESIGN_SCHEMA_VERSION = 1
export const TAO_DESIGN_ANALYZER_VERSION = 'deterministic-local-v1'
export const TAO_DESIGN_LLM_ANALYZER_VERSION = 'llm-theme-v1'
export const TAO_DESIGN_TOKEN_CATEGORIES = [
  'border',
  'color',
  'elevation',
  'font',
  'motion',
  'opacity',
  'radius',
  'shadow',
  'size',
  'spacing',
  'text',
  'transform',
] as const

export type TaoDesignMode = 'development' | 'production'
export type TaoDesignStatus = 'accepted' | 'suggested'
export type TaoDesignTokenCategory = typeof TAO_DESIGN_TOKEN_CATEGORIES[number]
export type TaoDesignJson = null | boolean | number | string | TaoDesignJson[] | { [key: string]: TaoDesignJson }

export type TaoDesignLock = {
  schemaVersion: number
  analyzer: TaoDesignAnalyzerMetadata
  appDesign: TaoDesignAppMetadata
  entries: Record<string, TaoDesignLockEntry>
  generatedAt?: string
}

export type TaoDesignAnalyzerMetadata = {
  name: string
  version: string
  profile: string
}

export type TaoDesignAppMetadata = {
  description: string
}

export type TaoDesignLockEntry = {
  identity: string
  inputHash: string
  status: TaoDesignStatus
  semantic: TaoDesignSemanticPayload
  resolved: TaoDesignResolvedPayload
  provenance: TaoDesignProvenance
}

export type TaoDesignSemanticPayload = {
  role: string
  compositeRole: string
  confidence: number
  rationale: string
  sourceIdentity: string
  designSpecIdentity: string
  description: string
}

export type TaoDesignResolvedPayload = {
  styleKey: string
  compositeRole: string
  baseStyle: Record<string, TaoDesignJson>
  adaptations?: Record<string, TaoDesignJson>
  states?: Record<string, TaoDesignJson>
  tokens?: Record<string, TaoDesignJson>
}

export type TaoDesignProvenance = {
  sourceIdentity: string
  designSpecIdentity: string
  inputHash: string
  analyzerVersion: string
  model: string
  confidence: number
  chosenRole: string
  compositeRole: string
  rationale: string
}

export type TaoDesignLockPaths = {
  lockDir: string
  acceptedPath: string
  suggestionPath: string
}

/** designLockPaths returns the accepted and suggestion design lock paths for a lock directory. */
export function designLockPaths(lockDir: string): TaoDesignLockPaths {
  const resolved = FS.resolvePath(lockDir)
  return {
    lockDir: resolved,
    acceptedPath: FS.joinPath(resolved, TAO_DESIGN_LOCK_FILE),
    suggestionPath: FS.joinPath(resolved, TAO_DESIGN_SUGGESTION_LOCK_FILE),
  }
}

/** readDesignLock reads a Tao design lock from disk, returning undefined when it does not exist. */
export function readDesignLock(path: string): TaoDesignLock | undefined {
  if (!FS.isFile(path)) {
    return undefined
  }
  return validateDesignLock(FS.readJsonFile(path), path)
}

/** validateDesignLock validates an untrusted JSON value before it is accepted as a Tao design lock. */
export function validateDesignLock(value: unknown, source = 'design lock'): TaoDesignLock {
  const errors: string[] = []
  if (!isRecord(value)) {
    throw new Error(`Invalid Tao design lock ${source}: expected top-level object.`)
  }
  expectExactNumber(value, 'schemaVersion', TAO_DESIGN_SCHEMA_VERSION, 'schemaVersion', errors)
  validateAnalyzer(value['analyzer'], errors)
  validateAppDesign(value['appDesign'], errors)
  validateEntries(value['entries'], errors)
  if (value['generatedAt'] !== undefined && typeof value['generatedAt'] !== 'string') {
    errors.push('generatedAt must be a string when present')
  }
  if (errors.length > 0) {
    throw new Error(`Invalid Tao design lock ${source}: ${errors.join('; ')}.`)
  }
  return value as TaoDesignLock
}

/** writeDesignLock writes a deterministic Tao design lock JSON document. */
export function writeDesignLock(path: string, lock: TaoDesignLock): void {
  FS.writeFile(path, `${stableStringify(compactDesignLock(lock))}\n`)
}

/** stableStringify serializes JSON with sorted object keys and two-space indentation. */
export function stableStringify(value: TaoDesignJson | TaoDesignLock): string {
  return JSON.stringify(sortJsonValue(value as TaoDesignJson), null, 2)
}

/** designInputHash hashes one deterministic design input object. */
export function designInputHash(input: TaoDesignJson): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex')
}

/** makeEmptyDesignLock creates a deterministic empty lock shell. */
export function makeEmptyDesignLock(appDesign: TaoDesignAppMetadata): TaoDesignLock {
  return {
    analyzer: {
      name: 'tao-design',
      profile: 'deterministic-local',
      version: TAO_DESIGN_ANALYZER_VERSION,
    },
    appDesign,
    entries: {},
    schemaVersion: TAO_DESIGN_SCHEMA_VERSION,
  }
}

/** sortedEntries returns lock entries ordered by identity. */
export function sortedEntries(entries: Iterable<TaoDesignLockEntry>): Record<string, TaoDesignLockEntry> {
  const sorted = [...entries].sort((a, b) => a.identity.localeCompare(b.identity))
  const out: Record<string, TaoDesignLockEntry> = {}
  for (const entry of sorted) {
    out[entry.identity] = entry
  }
  return out
}

function sortJsonValue(value: TaoDesignJson): TaoDesignJson {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }
  if (value === null || typeof value !== 'object') {
    return value
  }
  const out: { [key: string]: TaoDesignJson } = {}
  for (const key of Object.keys(value).sort()) {
    const item = value[key]
    if (item !== undefined) {
      out[key] = sortJsonValue(item)
    }
  }
  return out
}

function compactDesignLock(lock: TaoDesignLock): TaoDesignLock {
  return {
    ...lock,
    entries: Object.fromEntries(
      Object.entries(lock.entries).map(([identity, entry]) => [
        identity,
        {
          ...entry,
          resolved: compactResolvedPayload(entry.resolved),
        },
      ]),
    ),
  }
}

function compactResolvedPayload(payload: TaoDesignResolvedPayload): TaoDesignResolvedPayload {
  const adaptations = compactOptionalObject(payload.adaptations)
  const states = compactOptionalObject(payload.states)
  const tokens = compactOptionalObject(payload.tokens)
  const out: TaoDesignResolvedPayload = {
    baseStyle: payload.baseStyle,
    compositeRole: payload.compositeRole,
    styleKey: payload.styleKey,
  }
  if (adaptations !== undefined) {
    out.adaptations = adaptations
  }
  if (states !== undefined) {
    out.states = states
  }
  if (tokens !== undefined) {
    out.tokens = tokens
  }
  return out
}

function compactOptionalObject(
  value: Record<string, TaoDesignJson> | undefined,
): Record<string, TaoDesignJson> | undefined {
  if (value === undefined) {
    return undefined
  }
  const compacted = compactJsonObject(value)
  return Object.keys(compacted).length === 0 ? undefined : compacted
}

function compactJsonObject(value: Record<string, TaoDesignJson>): Record<string, TaoDesignJson> {
  const out: Record<string, TaoDesignJson> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const compacted = compactJsonObject(item)
      if (Object.keys(compacted).length > 0) {
        out[key] = compacted
      }
      continue
    }
    out[key] = item
  }
  return out
}

function validateAnalyzer(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('analyzer must be an object')
    return
  }
  expectString(value, 'name', 'analyzer.name', errors)
  expectString(value, 'version', 'analyzer.version', errors)
  expectString(value, 'profile', 'analyzer.profile', errors)
}

function validateAppDesign(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('appDesign must be an object')
    return
  }
  expectString(value, 'description', 'appDesign.description', errors)
}

function validateEntries(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push('entries must be an object')
    return
  }
  for (const [identity, entry] of Object.entries(value)) {
    const path = `entries.${identity}`
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object`)
      continue
    }
    expectString(entry, 'identity', `${path}.identity`, errors)
    if (entry['identity'] !== identity) {
      errors.push(`${path}.identity must match its entries key`)
    }
    expectString(entry, 'inputHash', `${path}.inputHash`, errors)
    const status = entry['status']
    if (status !== 'accepted' && status !== 'suggested') {
      errors.push(`${path}.status must be accepted or suggested`)
    }
    validateSemanticPayload(entry['semantic'], `${path}.semantic`, errors)
    validateResolvedPayload(entry['resolved'], `${path}.resolved`, errors)
    validateProvenance(entry['provenance'], `${path}.provenance`, errors)
  }
}

function validateSemanticPayload(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return
  }
  for (const key of ['role', 'compositeRole', 'rationale', 'sourceIdentity', 'designSpecIdentity', 'description']) {
    expectString(value, key, `${path}.${key}`, errors)
  }
  expectNumber(value, 'confidence', `${path}.confidence`, errors)
}

function validateResolvedPayload(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return
  }
  expectString(value, 'styleKey', `${path}.styleKey`, errors)
  expectString(value, 'compositeRole', `${path}.compositeRole`, errors)
  validateJsonObject(value['baseStyle'], `${path}.baseStyle`, errors)
  validateOptionalJsonObject(value, 'adaptations', `${path}.adaptations`, errors)
  validateOptionalJsonObject(value, 'states', `${path}.states`, errors)
  validateOptionalJsonObject(value, 'tokens', `${path}.tokens`, errors)
}

function validateProvenance(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return
  }
  for (
    const key of [
      'sourceIdentity',
      'designSpecIdentity',
      'inputHash',
      'analyzerVersion',
      'model',
      'chosenRole',
      'compositeRole',
      'rationale',
    ]
  ) {
    expectString(value, key, `${path}.${key}`, errors)
  }
  expectNumber(value, 'confidence', `${path}.confidence`, errors)
}

function validateOptionalJsonObject(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): void {
  if (value[key] !== undefined) {
    validateJsonObject(value[key], path, errors)
  }
}

function validateJsonObject(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return
  }
  validateJsonValue(value, path, errors)
}

function validateJsonValue(value: unknown, path: string, errors: string[]): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      errors.push(`${path} must be a finite number`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonValue(item, `${path}[${index}]`, errors))
    return
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) {
        errors.push(`${path}.${key} must not be undefined`)
      } else {
        validateJsonValue(item, `${path}.${key}`, errors)
      }
    }
    return
  }
  errors.push(`${path} must be JSON-compatible`)
}

function expectExactNumber(
  value: Record<string, unknown>,
  key: string,
  expected: number,
  path: string,
  errors: string[],
): void {
  if (value[key] !== expected) {
    errors.push(`${path} must be ${expected}`)
  }
}

function expectNumber(value: Record<string, unknown>, key: string, path: string, errors: string[]): void {
  if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) {
    errors.push(`${path} must be a finite number`)
  }
}

function expectString(value: Record<string, unknown>, key: string, path: string, errors: string[]): void {
  if (typeof value[key] !== 'string') {
    errors.push(`${path} must be a string`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
