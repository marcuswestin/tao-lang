import { spawn } from '@shared/exec'
import type { TaoDesignRequirement } from './design-analysis'
import {
  stableStringify,
  TAO_DESIGN_LLM_ANALYZER_VERSION,
  TAO_DESIGN_TOKEN_CATEGORIES,
  type TaoDesignAnalyzerMetadata,
  type TaoDesignJson,
  type TaoDesignLock,
  type TaoDesignLockEntry,
  type TaoDesignResolvedPayload,
  type TaoDesignTokenCategory,
} from './design-lock'

export type TaoDesignLLMProviderName = 'codex-cli' | 'claude-cli'

export type TaoDesignSuggestionProviderInput = {
  appDesignDescription: string
  acceptedLock?: TaoDesignLock
  deterministicEntries: TaoDesignLockEntry[]
  requirements: TaoDesignRequirement[]
}

export type TaoDesignSuggestionProviderResult = {
  analyzer: TaoDesignAnalyzerMetadata
  entries: TaoDesignLockEntry[]
}

export type TaoDesignSuggestionProvider = (
  input: TaoDesignSuggestionProviderInput,
) => Promise<TaoDesignSuggestionProviderResult>

export type TaoDesignCommandResult = {
  status: number | null
  stdout: string
  stderr: string
}

export type TaoDesignCommandRunner = (
  command: string,
  args: readonly string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; maxOutputBytes?: number; timeoutMs?: number },
) => Promise<TaoDesignCommandResult>

export type TaoDesignLLMProviderOptions = {
  provider: TaoDesignLLMProviderName
  model?: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  commandRunner?: TaoDesignCommandRunner
  maxOutputBytes?: number
  timeoutMs?: number
}

type TaoLLMDesignOutput = {
  theme: {
    name: string
    rationale: string
    tokens: TaoLLMDesignToken[]
  }
  entries: TaoLLMDesignEntry[]
}

type TaoLLMDesignEntry = {
  identity: string
  role: string
  compositeRole: string
  confidence: number
  rationale: string
  baseStyle: TaoLLMStyleDeclaration[]
  darkStyle: TaoLLMStyleDeclaration[]
  regularScreenStyle: TaoLLMStyleDeclaration[]
  largeTextStyle: TaoLLMStyleDeclaration[]
  reducedMotionStyle: TaoLLMStyleDeclaration[]
  states: {
    pressed: TaoLLMStyleDeclaration[]
    disabled: TaoLLMStyleDeclaration[]
    focused: TaoLLMStyleDeclaration[]
    selected: TaoLLMStyleDeclaration[]
  }
  tokens: TaoLLMDesignToken[]
}

type TaoLLMDesignToken = {
  category: TaoDesignTokenCategory
  name: string
  value: TaoLLMStyleValue
}

type TaoLLMStyleDeclaration = {
  key: TaoAllowedStyleKey
  value: TaoLLMStyleValue
}

type TaoLLMStyleValue = boolean | number | string

const DEFAULT_CLAUDE_MODEL = 'sonnet'
const DEFAULT_CODEX_MODEL = 'gpt-5.2'
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024
const MAX_RETRY_VALIDATION_MESSAGE_LENGTH = 2_000

const ALLOWED_COMPOSITE_ROLES = [
  'composite.action.danger',
  'composite.action.primary',
  'composite.action.secondary',
  'composite.action.warning',
  'composite.input.field',
  'composite.layout.structural',
  'composite.surface.card',
  'composite.surface.plain',
  'composite.surface.warning',
  'composite.text.body',
  'composite.text.label',
  'composite.text.metric',
  'composite.text.supporting',
] as const

const ALLOWED_STYLE_KEYS = [
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'color',
  'elevation',
  'fontSize',
  'fontWeight',
  'height',
  'letterSpacing',
  'lineHeight',
  'marginBottom',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginVertical',
  'maxWidth',
  'minHeight',
  'minWidth',
  'opacity',
  'paddingBottom',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingVertical',
  'width',
] as const

type TaoAllowedStyleKey = typeof ALLOWED_STYLE_KEYS[number]

/** createTaoDesignLLMProvider creates an optional LLM-backed Tao design suggestion provider. */
export function createTaoDesignLLMProvider(opts: TaoDesignLLMProviderOptions): TaoDesignSuggestionProvider {
  if (opts.provider === 'claude-cli') {
    return input => callClaudeCLIProvider(input, opts)
  }
  return input => callCodexCLIProvider(input, opts)
}

/** createFixtureDesignSuggestionProvider creates deterministic rich design output for hermetic tests. */
export function createFixtureDesignSuggestionProvider(): TaoDesignSuggestionProvider {
  return async input => ({
    analyzer: analyzerMetadata('fixture-provider', 'fixture'),
    entries: normalizeLLMDesignOutput(input, fixtureOutput(input), 'fixture-provider', 'fixture-model'),
  })
}

/** buildTaoDesignLLMPrompt returns the prompt sent to external design suggestion providers. */
export function buildTaoDesignLLMPrompt(input: TaoDesignSuggestionProviderInput): string {
  const payload = {
    acceptedEntries: Object.values(input.acceptedLock?.entries ?? {}).map(entry => ({
      adaptations: entry.resolved.adaptations ?? {},
      baseStyle: entry.resolved.baseStyle,
      compositeRole: entry.semantic.compositeRole,
      identity: entry.identity,
      role: entry.semantic.role,
      states: entry.resolved.states ?? {},
      tokens: entry.resolved.tokens ?? {},
    })),
    allowedCompositeRoles: [...ALLOWED_COMPOSITE_ROLES],
    allowedReactNativeStyleKeys: [...ALLOWED_STYLE_KEYS],
    appDesignDescription: input.appDesignDescription,
    requiredEntries: input.requirements.map(req => ({
      description: req.description,
      designSpec: req.input && typeof req.input === 'object' && !Array.isArray(req.input)
        ? (req.input as Record<string, TaoDesignJson>)['designSpec']
        : '',
      identity: req.identity,
      kind: req.kind,
      rootName: req.rootName,
      sourceIdentity: req.sourceIdentity,
      variantChain: req.variantChain,
    })),
    requiredTokenCategories: [...TAO_DESIGN_TOKEN_CATEGORIES],
  }
  return [
    'Generate a beautiful, restrained native React Native design theme for this Tao app.',
    'Return only JSON that matches the supplied schema.',
    'Use one coherent app palette across all entries.',
    'Use exact required identities, no extra identities, and no missing identities.',
    'Use only the listed composite roles and React Native style keys.',
    'Colors must be #RRGGBB. Numeric spacing, radius, text sizes, borders, and opacity must be numbers.',
    'Action entries should include pressed, disabled, focused, and selected states.',
    stableStringify(payload as TaoDesignJson),
  ].join('\n\n')
}

/** taoDesignLLMOutputSchema returns the strict structured output schema for LLM design generation. */
export function taoDesignLLMOutputSchema(): TaoDesignJson {
  const styleDeclarationSchema = {
    additionalProperties: false,
    properties: {
      key: { enum: [...ALLOWED_STYLE_KEYS], type: 'string' },
      value: {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
        ],
      },
    },
    required: ['key', 'value'],
    type: 'object',
  }
  const tokenSchema = {
    additionalProperties: false,
    properties: {
      category: { enum: [...TAO_DESIGN_TOKEN_CATEGORIES], type: 'string' },
      name: { type: 'string' },
      value: {
        anyOf: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
        ],
      },
    },
    required: ['category', 'name', 'value'],
    type: 'object',
  }
  const styleListSchema = { items: styleDeclarationSchema, type: 'array' }
  return {
    additionalProperties: false,
    properties: {
      entries: {
        items: {
          additionalProperties: false,
          properties: {
            baseStyle: styleListSchema,
            compositeRole: { enum: [...ALLOWED_COMPOSITE_ROLES], type: 'string' },
            confidence: { type: 'number' },
            darkStyle: styleListSchema,
            identity: { type: 'string' },
            largeTextStyle: styleListSchema,
            rationale: { type: 'string' },
            reducedMotionStyle: styleListSchema,
            regularScreenStyle: styleListSchema,
            role: { type: 'string' },
            states: {
              additionalProperties: false,
              properties: {
                disabled: styleListSchema,
                focused: styleListSchema,
                pressed: styleListSchema,
                selected: styleListSchema,
              },
              required: ['pressed', 'disabled', 'focused', 'selected'],
              type: 'object',
            },
            tokens: { items: tokenSchema, type: 'array' },
          },
          required: [
            'identity',
            'role',
            'compositeRole',
            'confidence',
            'rationale',
            'baseStyle',
            'darkStyle',
            'regularScreenStyle',
            'largeTextStyle',
            'reducedMotionStyle',
            'states',
            'tokens',
          ],
          type: 'object',
        },
        type: 'array',
      },
      theme: {
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          rationale: { type: 'string' },
          tokens: { items: tokenSchema, type: 'array' },
        },
        required: ['name', 'rationale', 'tokens'],
        type: 'object',
      },
    },
    required: ['theme', 'entries'],
    type: 'object',
  } as TaoDesignJson
}

/** normalizeLLMDesignOutput validates and converts LLM design output into Tao lock entries. */
export function normalizeLLMDesignOutput(
  input: TaoDesignSuggestionProviderInput,
  output: unknown,
  providerName: string,
  model: string,
): TaoDesignLockEntry[] {
  assertObject(output, 'LLM design output')
  const theme = readRequiredObject(output, 'theme')
  const entries = readRequiredArray(output, 'entries')
  const requirementsByIdentity = new Map(input.requirements.map(req => [req.identity, req]))
  const outputIdentities = new Set<string>()
  const normalized: TaoDesignLockEntry[] = []
  for (const entry of entries) {
    assertObject(entry, 'LLM design entry')
    const identity = readRequiredString(entry, 'identity')
    if (outputIdentities.has(identity)) {
      throw new Error(`LLM design output contains duplicate entry: ${identity}`)
    }
    outputIdentities.add(identity)
    const req = requirementsByIdentity.get(identity)
    if (req === undefined) {
      throw new Error(`LLM design output contains unknown entry: ${identity}`)
    }
    const compositeRole = readRequiredString(entry, 'compositeRole')
    if (!ALLOWED_COMPOSITE_ROLES.includes(compositeRole as typeof ALLOWED_COMPOSITE_ROLES[number])) {
      throw new Error(`LLM design output uses unsupported composite role '${compositeRole}' for ${identity}`)
    }
    const role = readRequiredString(entry, 'role')
    const confidence = readRequiredNumber(entry, 'confidence')
    if (confidence < 0 || confidence > 1) {
      throw new Error(`LLM design output confidence must be between 0 and 1 for ${identity}`)
    }
    const rationale = readRequiredString(entry, 'rationale')
    const resolved = resolvedPayloadFromLLMEntry(identity, compositeRole, theme, entry)
    normalized.push({
      identity,
      inputHash: req.inputHash,
      provenance: {
        analyzerVersion: TAO_DESIGN_LLM_ANALYZER_VERSION,
        chosenRole: role,
        compositeRole,
        confidence,
        designSpecIdentity: req.designSpecIdentity,
        inputHash: req.inputHash,
        model: `${providerName}:${model}`,
        rationale,
        sourceIdentity: req.sourceIdentity,
      },
      resolved,
      semantic: {
        compositeRole,
        confidence,
        description: req.description,
        designSpecIdentity: req.designSpecIdentity,
        rationale,
        role,
        sourceIdentity: req.sourceIdentity,
      },
      status: 'suggested',
    })
  }
  for (const identity of requirementsByIdentity.keys()) {
    if (!outputIdentities.has(identity)) {
      throw new Error(`LLM design output is missing required entry: ${identity}`)
    }
  }
  return normalized.sort((a, b) => a.identity.localeCompare(b.identity))
}

async function callClaudeCLIProvider(
  input: TaoDesignSuggestionProviderInput,
  opts: TaoDesignLLMProviderOptions,
): Promise<TaoDesignSuggestionProviderResult> {
  const model = opts.model ?? DEFAULT_CLAUDE_MODEL
  const result = await runDesignCommand('claude', [
    '--bare',
    '--print',
    '--output-format',
    'json',
    '--json-schema',
    stableStringify(taoDesignLLMOutputSchema()),
    '--tools',
    '',
    '--no-session-persistence',
    '--model',
    model,
    buildTaoDesignLLMPrompt(input),
  ], opts)
  if (result.status !== 0) {
    throw new Error(`Claude design generation failed: ${result.stderr || result.stdout}`)
  }
  const output = parseCLIJSONOutput(result.stdout)
  return {
    analyzer: analyzerMetadata('claude-cli', model),
    entries: normalizeLLMDesignOutput(input, output, 'claude-cli', model),
  }
}

async function callCodexCLIProvider(
  input: TaoDesignSuggestionProviderInput,
  opts: TaoDesignLLMProviderOptions,
): Promise<TaoDesignSuggestionProviderResult> {
  const model = opts.model ?? DEFAULT_CODEX_MODEL
  const basePrompt = buildTaoDesignLLMPrompt(input)
  let validationMessage: string | undefined
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = codexPromptForAttempt(basePrompt, validationMessage)
    const result = await runDesignCommand('codex', [
      'exec',
      '--cd',
      opts.cwd ?? process.cwd(),
      '--sandbox',
      'read-only',
      '--ask-for-approval',
      'never',
      '--model',
      model,
      prompt,
    ], opts)
    if (result.status !== 0) {
      throw new Error(`Codex design generation failed: ${result.stderr || result.stdout}`)
    }
    try {
      const output = parseJSON(extractJSONObjectText(result.stdout))
      return {
        analyzer: analyzerMetadata('codex-cli', model),
        entries: normalizeLLMDesignOutput(input, output, 'codex-cli', model),
      }
    } catch (error) {
      validationMessage = retryValidationMessage(error)
    }
  }
  throw new Error(`Codex design generation returned invalid JSON/schema after retry: ${validationMessage}`)
}

function codexPromptForAttempt(basePrompt: string, validationMessage: string | undefined): string {
  if (validationMessage === undefined) {
    return `${basePrompt}\n\nReturn raw JSON only.`
  }
  return [
    basePrompt,
    `The previous output failed Tao design validation: ${validationMessage}`,
    'Return corrected raw JSON only.',
  ].join('\n\n')
}

function resolvedPayloadFromLLMEntry(
  identity: string,
  compositeRole: string,
  theme: Record<string, unknown>,
  entry: Record<string, unknown>,
): TaoDesignResolvedPayload {
  const baseStyle = styleObject(readRequiredArray(entry, 'baseStyle'), `${identity}.baseStyle`)
  const darkStyle = styleObject(readRequiredArray(entry, 'darkStyle'), `${identity}.darkStyle`)
  const regularScreenStyle = styleObject(
    readRequiredArray(entry, 'regularScreenStyle'),
    `${identity}.regularScreenStyle`,
  )
  const largeTextStyle = styleObject(readRequiredArray(entry, 'largeTextStyle'), `${identity}.largeTextStyle`)
  const reducedMotionStyle = styleObject(
    readRequiredArray(entry, 'reducedMotionStyle'),
    `${identity}.reducedMotionStyle`,
  )
  const states = readRequiredObject(entry, 'states')
  const entryTokens = readTokens(readRequiredArray(theme, 'tokens'))
  mergeTokens(entryTokens, readTokens(readRequiredArray(entry, 'tokens')))
  const adaptations = compactDesignObject({
    colorScheme: { dark: darkStyle },
    reducedMotion: { reduce: reducedMotionStyle },
    screenSize: { regular: regularScreenStyle },
    textScale: { large: largeTextStyle },
  })
  const stateStyles = compactDesignObject({
    disabled: styleObject(readRequiredArray(states, 'disabled'), `${identity}.states.disabled`),
    focused: styleObject(readRequiredArray(states, 'focused'), `${identity}.states.focused`),
    pressed: styleObject(readRequiredArray(states, 'pressed'), `${identity}.states.pressed`),
    selected: styleObject(readRequiredArray(states, 'selected'), `${identity}.states.selected`),
  })
  return {
    ...(Object.keys(adaptations).length > 0 ? { adaptations } : {}),
    baseStyle,
    compositeRole,
    ...(Object.keys(stateStyles).length > 0 ? { states: stateStyles } : {}),
    styleKey: `style.${slug(identity)}`,
    ...(Object.keys(entryTokens).length > 0 ? { tokens: entryTokens } : {}),
  }
}

function styleObject(items: unknown[], context: string): Record<string, TaoDesignJson> {
  const out: Record<string, TaoDesignJson> = {}
  for (const item of items) {
    assertObject(item, context)
    const key = readRequiredString(item, 'key')
    if (!ALLOWED_STYLE_KEYS.includes(key as TaoAllowedStyleKey)) {
      throw new Error(`Unsupported React Native style key '${key}' in ${context}`)
    }
    const value = readStyleValue(item['value'], `${context}.${key}`)
    validateStyleValue(key as TaoAllowedStyleKey, value, context)
    out[key] = value
  }
  return out
}

function readTokens(items: unknown[]): Record<string, TaoDesignJson> {
  const out: Record<string, TaoDesignJson> = {}
  for (const item of items) {
    assertObject(item, 'design token')
    const category = readRequiredString(item, 'category')
    if (!TAO_DESIGN_TOKEN_CATEGORIES.includes(category as TaoDesignTokenCategory)) {
      throw new Error(`Unsupported design token category '${category}'`)
    }
    const name = readRequiredString(item, 'name')
    if (!/^[a-z][a-z0-9.-]*$/.test(name)) {
      throw new Error(`Invalid design token name '${name}'`)
    }
    const value = readStyleValue(item['value'], `token.${category}.${name}`)
    const categoryTokens = out[category] ?? {}
    if (categoryTokens !== null && typeof categoryTokens === 'object' && !Array.isArray(categoryTokens)) {
      categoryTokens[name] = value
      out[category] = categoryTokens
    }
  }
  return out
}

function mergeTokens(target: Record<string, TaoDesignJson>, source: Record<string, TaoDesignJson>): void {
  for (const [category, tokens] of Object.entries(source)) {
    const targetTokens = target[category] ?? {}
    if (
      tokens !== null && typeof tokens === 'object' && !Array.isArray(tokens)
      && targetTokens !== null && typeof targetTokens === 'object' && !Array.isArray(targetTokens)
    ) {
      Object.assign(targetTokens, tokens)
      target[category] = targetTokens
    }
  }
}

function validateStyleValue(key: TaoAllowedStyleKey, value: TaoDesignJson, context: string): void {
  if (key === 'backgroundColor' || key === 'borderColor' || key === 'color') {
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`Expected #RRGGBB color for ${context}.${key}`)
    }
    return
  }
  if (key === 'fontWeight') {
    if (typeof value !== 'string' || !/^(400|500|600|700|800)$/.test(value)) {
      throw new Error(`Expected fontWeight string 400-800 for ${context}.${key}`)
    }
    return
  }
  if (typeof value !== 'number') {
    throw new Error(`Expected numeric value for ${context}.${key}`)
  }
  if (key === 'opacity' && (value < 0 || value > 1)) {
    throw new Error(`Expected opacity between 0 and 1 for ${context}.${key}`)
  }
  if (key !== 'opacity' && value < 0) {
    throw new Error(`Expected non-negative value for ${context}.${key}`)
  }
}

function readStyleValue(value: unknown, context: string): TaoDesignJson {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  throw new Error(`Invalid style value for ${context}`)
}

function fixtureOutput(input: TaoDesignSuggestionProviderInput): TaoLLMDesignOutput {
  return {
    entries: input.requirements.map(req => {
      const role = req.rootName === 'Button' || req.identity.toLowerCase().includes('action')
        ? 'polished primary action'
        : req.rootName === 'TextInput' || req.identity.toLowerCase().includes('input')
        ? 'editable text input'
        : req.rootName.includes('Text')
        ? 'readable app text'
        : req.rootName === 'Number'
        ? 'metric text'
        : req.rootName === 'Box'
        ? 'elevated app surface'
        : 'structural layout'
      const compositeRole = req.rootName === 'Button' || req.identity.toLowerCase().includes('action')
        ? 'composite.action.primary'
        : req.rootName === 'TextInput' || req.identity.toLowerCase().includes('input')
        ? 'composite.input.field'
        : req.rootName === 'Number'
        ? 'composite.text.metric'
        : req.rootName.includes('Text')
        ? 'composite.text.body'
        : req.rootName === 'Box'
        ? 'composite.surface.card'
        : 'composite.layout.structural'
      return {
        baseStyle: baseStyleForFixtureComposite(compositeRole),
        compositeRole,
        confidence: 0.91,
        darkStyle: darkStyleForFixtureComposite(compositeRole),
        identity: req.identity,
        largeTextStyle: compositeRole.startsWith('composite.text.') ? [{ key: 'fontSize', value: 18 }] : [],
        rationale: 'Fixture provider generated a coherent app theme role.',
        reducedMotionStyle: [],
        regularScreenStyle: compositeRole.startsWith('composite.surface.') ? [{ key: 'maxWidth', value: 720 }] : [],
        role,
        states: {
          disabled: compositeRole.startsWith('composite.action.') ? [{ key: 'opacity', value: 0.46 }] : [],
          focused: compositeRole.startsWith('composite.action.') || compositeRole === 'composite.input.field'
            ? [{ key: 'borderWidth', value: 2 }]
            : [],
          pressed: compositeRole.startsWith('composite.action.') ? [{ key: 'opacity', value: 0.84 }] : [],
          selected: compositeRole.startsWith('composite.action.') ? [{ key: 'borderWidth', value: 2 }] : [],
        },
        tokens: [],
      }
    }),
    theme: {
      name: 'fixture aurora',
      rationale: 'A restrained blue-green theme for hermetic tests.',
      tokens: [
        { category: 'color', name: 'brand.primary', value: '#2563EB' },
        { category: 'color', name: 'surface.card', value: '#FFFFFF' },
        { category: 'radius', name: 'card', value: 10 },
        { category: 'spacing', name: 'inset.medium', value: 14 },
      ],
    },
  }
}

function baseStyleForFixtureComposite(compositeRole: string): TaoLLMStyleDeclaration[] {
  if (compositeRole.startsWith('composite.action.')) {
    return [
      { key: 'backgroundColor', value: '#2563EB' },
      { key: 'borderColor', value: '#2563EB' },
      { key: 'borderRadius', value: 10 },
      { key: 'borderWidth', value: 1 },
      { key: 'color', value: '#FFFFFF' },
      { key: 'paddingHorizontal', value: 14 },
      { key: 'paddingVertical', value: 9 },
    ]
  }
  if (compositeRole === 'composite.surface.card') {
    return [
      { key: 'backgroundColor', value: '#FFFFFF' },
      { key: 'borderColor', value: '#D7DEE8' },
      { key: 'borderRadius', value: 10 },
      { key: 'borderWidth', value: 1 },
    ]
  }
  if (compositeRole === 'composite.input.field') {
    return [
      { key: 'backgroundColor', value: '#FFFFFF' },
      { key: 'borderColor', value: '#CBD5E1' },
      { key: 'borderRadius', value: 10 },
      { key: 'borderWidth', value: 1 },
      { key: 'color', value: '#0F172A' },
      { key: 'fontSize', value: 16 },
      { key: 'minHeight', value: 44 },
      { key: 'paddingHorizontal', value: 14 },
      { key: 'paddingVertical', value: 10 },
    ]
  }
  if (compositeRole === 'composite.text.metric') {
    return [
      { key: 'color', value: '#0F172A' },
      { key: 'fontSize', value: 30 },
      { key: 'fontWeight', value: '700' },
    ]
  }
  if (compositeRole.startsWith('composite.text.')) {
    return [
      { key: 'color', value: '#1E293B' },
      { key: 'fontSize', value: 16 },
      { key: 'lineHeight', value: 22 },
    ]
  }
  return []
}

function darkStyleForFixtureComposite(compositeRole: string): TaoLLMStyleDeclaration[] {
  if (compositeRole.startsWith('composite.action.')) {
    return [
      { key: 'backgroundColor', value: '#60A5FA' },
      { key: 'borderColor', value: '#60A5FA' },
      { key: 'color', value: '#0F172A' },
    ]
  }
  if (compositeRole.startsWith('composite.surface.') || compositeRole === 'composite.input.field') {
    return [
      { key: 'backgroundColor', value: '#111827' },
      { key: 'borderColor', value: '#334155' },
      ...(compositeRole === 'composite.input.field' ? [{ key: 'color' as const, value: '#F8FAFC' }] : []),
    ]
  }
  if (compositeRole.startsWith('composite.text.')) {
    return [{ key: 'color', value: '#F8FAFC' }]
  }
  return []
}

function compactDesignObject(value: Record<string, TaoDesignJson>): Record<string, TaoDesignJson> {
  const out: Record<string, TaoDesignJson> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const compacted = compactDesignObject(item)
      if (Object.keys(compacted).length > 0) {
        out[key] = compacted
      }
      continue
    }
    out[key] = item
  }
  return out
}

function analyzerMetadata(profile: string, model: string): TaoDesignAnalyzerMetadata {
  return {
    name: 'tao-design',
    profile,
    version: `${TAO_DESIGN_LLM_ANALYZER_VERSION}:${model}`,
  }
}

async function runDesignCommand(
  command: string,
  args: readonly string[],
  opts: TaoDesignLLMProviderOptions,
): Promise<TaoDesignCommandResult> {
  const runner = opts.commandRunner ?? defaultCommandRunner
  try {
    return await runner(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      maxOutputBytes: opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
      timeoutMs: opts.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
    })
  } catch (error) {
    throw new Error(formatCommandError(command, error))
  }
}

function defaultCommandRunner(
  command: string,
  args: readonly string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; maxOutputBytes?: number; timeoutMs?: number },
): Promise<TaoDesignCommandResult> {
  return new Promise((resolve, reject) => {
    const maxOutputBytes = opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
    const timeoutMs = opts.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
    let didSettle = false
    const child = spawn(command, [...args], {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let outputBytes = 0
    const timeout = setTimeout(() => {
      settle(() => {
        child.kill('SIGTERM')
        reject(new Error(`${command} design generation timed out after ${timeoutMs}ms.`))
      })
    }, timeoutMs)
    const appendOutput = (target: 'stderr' | 'stdout', chunk: string) => {
      outputBytes += Buffer.byteLength(chunk)
      if (outputBytes > maxOutputBytes) {
        settle(() => {
          child.kill('SIGTERM')
          reject(new Error(`${command} design generation exceeded ${maxOutputBytes} bytes of output.`))
        })
        return
      }
      if (target === 'stdout') {
        stdout += chunk
      } else {
        stderr += chunk
      }
    }
    const settle = (fn: () => void) => {
      if (didSettle) {
        return
      }
      didSettle = true
      clearTimeout(timeout)
      fn()
    }
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', chunk => {
      appendOutput('stdout', chunk)
    })
    child.stderr?.on('data', chunk => {
      appendOutput('stderr', chunk)
    })
    child.on('error', error => {
      settle(() => reject(error))
    })
    child.on('close', status => {
      settle(() => resolve({ status, stderr, stdout }))
    })
  })
}

function formatCommandError(command: string, error: unknown): string {
  if (isNodeError(error) && error.code === 'ENOENT') {
    return `${command} CLI not found in PATH. Install ${command} or choose another --llm-provider.`
  }
  return error instanceof Error ? error.message : String(error)
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

function parseCLIJSONOutput(stdout: string): unknown {
  const parsed = parseJSON(stdout)
  if (parsed && typeof parsed === 'object') {
    if ('result' in parsed) {
      const result = parsed.result
      return typeof result === 'string' ? parseJSON(result) : result
    }
    if ('content' in parsed && typeof parsed.content === 'string') {
      return parseJSON(parsed.content)
    }
  }
  return parsed
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Expected JSON design provider output: ${String(error)}`)
  }
}

function extractJSONObjectText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }
  let firstParsedObject: string | undefined
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') {
      continue
    }
    const candidate = balancedJSONObjectAt(text, i)
    if (candidate === undefined) {
      continue
    }
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        firstParsedObject ??= candidate
        if ('entries' in parsed) {
          return candidate
        }
      }
    } catch {
      continue
    }
  }
  if (firstParsedObject !== undefined) {
    return firstParsedObject
  }
  throw new Error('Expected Codex design provider output to contain a valid JSON object.')
}

function balancedJSONObjectAt(text: string, start: number): string | undefined {
  let depth = 0
  let escaped = false
  let inString = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = inString
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (char === '{') {
      depth++
      continue
    }
    if (char !== '}') {
      continue
    }
    depth--
    if (depth === 0) {
      return text.slice(start, i + 1)
    }
  }
  return undefined
}

function retryValidationMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.length <= MAX_RETRY_VALIDATION_MESSAGE_LENGTH) {
    return message
  }
  return `${message.slice(0, MAX_RETRY_VALIDATION_MESSAGE_LENGTH)}...`
}

function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected ${name} to be an object.`)
  }
}

function readRequiredObject(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key]
  assertObject(value, key)
  return value
}

function readRequiredArray(source: Record<string, unknown>, key: string): unknown[] {
  const value = source[key]
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${key} to be an array.`)
  }
  return value
}

function readRequiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Expected ${key} to be a non-empty string.`)
  }
  return value
}

function readRequiredNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${key} to be a finite number.`)
  }
  return value
}

function slug(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/(^\.+|\.+$)/g, '')
    .toLowerCase()
}
