import { AST, LGM } from '@parser'
import { FS } from '@shared'
import {
  designInputHash,
  makeEmptyDesignLock,
  readDesignLock,
  sortedEntries,
  TAO_DESIGN_ANALYZER_VERSION,
  TAO_DESIGN_SCHEMA_VERSION,
  type TaoDesignJson,
  type TaoDesignLock,
  type TaoDesignLockEntry,
  type TaoDesignMode,
  type TaoDesignResolvedPayload,
  type TaoDesignStatus,
} from './design-lock'
import { stringTemplateTextOnlyLiteral } from './design-strings'
import {
  isViewLikeDeclaration,
  resolveVariantTargetView,
  type TaoViewLikeDeclaration,
  variantTargetChain,
} from './variant-resolution'

export type TaoDesignDiagnostic = {
  severity: 'error' | 'warning' | 'info'
  kind:
    | 'missing-lock'
    | 'invalid-lock'
    | 'missing-entry'
    | 'new-entry'
    | 'changed-entry'
    | 'stale-entry'
    | 'low-confidence'
  message: string
  identity?: string
}

export type TaoDesignAnalysisOptions = {
  mainTaoFile: AST.TaoFile
  importedTaoFiles: AST.TaoFile[]
  entryAbsolutePath: string
  stdLibRoot?: string
  lockDir?: string
  mode: TaoDesignMode
}

export type TaoDesignAnalysisResult = {
  appDesignDescription: string
  acceptedLock?: TaoDesignLock
  effectiveLock: TaoDesignLock
  suggestionLock: TaoDesignLock
  diagnostics: TaoDesignDiagnostic[]
  requiredEntries: TaoDesignLockEntry[]
  identityByNode: WeakMap<TaoViewLikeDeclaration, string>
  requirements: TaoDesignRequirement[]
}

export type TaoDesignRequirement = {
  identity: string
  inputHash: string
  input: TaoDesignJson
  description: string
  sourceIdentity: string
  designSpecIdentity: string
  kind: string
  rootName: string
  variantChain: string[]
}

type DesignRequirement = TaoDesignRequirement & {
  appPaletteSeed: string
  node: TaoViewLikeDeclaration
}

/** analyzeTaoDesign builds the V1 deterministic design graph and reconciles it with accepted design locks. */
export function analyzeTaoDesign(opts: TaoDesignAnalysisOptions): TaoDesignAnalysisResult {
  const allFiles = dedupeTaoFilesByUri([opts.mainTaoFile, ...opts.importedTaoFiles])
  const app = findEntryAppDeclaration(opts.mainTaoFile)
  const appDesignDescription = appDesignDescriptionOf(app)
  const lockDir = opts.lockDir ?? FS.dirname(opts.entryAbsolutePath)
  const acceptedPath = FS.joinPath(lockDir, 'tao.design.lock')
  const diagnostics: TaoDesignDiagnostic[] = []
  let acceptedLock: TaoDesignLock | undefined
  let acceptedLockInvalid = false
  try {
    acceptedLock = readDesignLock(acceptedPath)
  } catch (err) {
    acceptedLockInvalid = true
    diagnostics.push({
      kind: 'invalid-lock',
      message: err instanceof Error ? err.message : `Invalid accepted design lock: ${acceptedPath}`,
      severity: opts.mode === 'production' ? 'error' : 'warning',
    })
  }
  if (opts.mode === 'production' && acceptedLock === undefined && !acceptedLockInvalid) {
    diagnostics.push({
      kind: 'missing-lock',
      message: `Missing accepted design lock: ${acceptedPath}`,
      severity: 'error',
    })
  }

  const identityByNode = new WeakMap<TaoViewLikeDeclaration, string>()
  const requirements = collectDesignRequirements({
    allFiles,
    app,
    appDesignDescription,
    appPaletteSeed: appPaletteSeedFor({
      app,
      appDesignDescription,
      entryAbsolutePath: opts.entryAbsolutePath,
    }),
    entryAbsolutePath: opts.entryAbsolutePath,
    stdLibRoot: opts.stdLibRoot,
    identityByNode,
  })
  const requiredEntries: TaoDesignLockEntry[] = []
  const effectiveEntries: TaoDesignLockEntry[] = []
  const suggestionEntries = new Map<string, TaoDesignLockEntry>()
  const requiredIdentities = new Set<string>()

  for (const req of requirements) {
    requiredIdentities.add(req.identity)
    const generated = generateDesignEntry(req, 'suggested')
    requiredEntries.push(generated)
    const accepted = acceptedLock?.entries[req.identity]
    if (accepted?.status === 'accepted' && accepted.inputHash === req.inputHash) {
      effectiveEntries.push(accepted)
      suggestionEntries.set(req.identity, accepted)
      continue
    }
    if (opts.mode === 'production') {
      diagnostics.push({
        identity: req.identity,
        kind: accepted === undefined ? 'missing-entry' : 'stale-entry',
        message: accepted === undefined
          ? `Missing accepted design entry for ${req.identity}. Run 'tao design' and 'tao design update'.`
          : `Stale accepted design entry for ${req.identity}. Run 'tao design' and 'tao design update'.`,
        severity: 'error',
      })
    } else {
      diagnostics.push({
        identity: req.identity,
        kind: accepted === undefined ? 'new-entry' : 'changed-entry',
        message: accepted === undefined
          ? `New design entry for ${req.identity}.`
          : `Changed design entry for ${req.identity}.`,
        severity: 'info',
      })
    }
    if (generated.semantic.confidence < 0.6) {
      diagnostics.push({
        identity: req.identity,
        kind: 'low-confidence',
        message: `Low-confidence design suggestion for ${req.identity}: ${generated.semantic.rationale}`,
        severity: 'warning',
      })
    }
    effectiveEntries.push(generated)
    suggestionEntries.set(req.identity, generated)
  }
  for (const entry of Object.values(acceptedLock?.entries ?? {})) {
    if (!requiredIdentities.has(entry.identity)) {
      diagnostics.push({
        identity: entry.identity,
        kind: 'stale-entry',
        message: `Stale design entry no longer referenced: ${entry.identity}.`,
        severity: 'info',
      })
    }
  }

  const appDesign = { description: appDesignDescription }
  const effectiveLock = makeEmptyDesignLock(appDesign)
  effectiveLock.entries = sortedEntries(effectiveEntries)
  const suggestionLock = makeEmptyDesignLock(appDesign)
  suggestionLock.entries = sortedEntries(suggestionEntries.values())
  suggestionLock.generatedAt = new Date(0).toISOString()

  return {
    acceptedLock,
    appDesignDescription,
    diagnostics,
    effectiveLock,
    identityByNode,
    requiredEntries,
    requirements: requirements.map(requirementForProvider),
    suggestionLock,
  }
}

/** acceptedDesignLockFromSuggestions rewrites a suggestion lock into accepted state. */
export function acceptedDesignLockFromSuggestions(lock: TaoDesignLock): TaoDesignLock {
  const accepted = makeEmptyDesignLock(lock.appDesign)
  accepted.generatedAt = lock.generatedAt
  accepted.entries = sortedEntries(
    Object.values(lock.entries).map(entry => ({
      ...entry,
      status: 'accepted' as const,
    })),
  )
  return accepted
}

function collectDesignRequirements(opts: {
  allFiles: AST.TaoFile[]
  app: AST.AppDeclaration | undefined
  appDesignDescription: string
  appPaletteSeed: string
  entryAbsolutePath: string
  stdLibRoot?: string
  identityByNode: WeakMap<TaoViewLikeDeclaration, string>
}): DesignRequirement[] {
  const out: DesignRequirement[] = []
  const seen = new Set<TaoViewLikeDeclaration>()
  const queued: TaoViewLikeDeclaration[] = []
  const appUi = opts.app?.appStatements.find(AST.isAppUiStatement)
  if (isViewLikeDeclaration(appUi?.ui.ref)) {
    queued.push(appUi.ui.ref)
  }

  while (queued.length > 0) {
    const node = queued.shift()!
    for (const chainNode of variantTargetChain(node)) {
      if (!seen.has(chainNode)) {
        seen.add(chainNode)
        const req = designRequirementForNode(chainNode, opts)
        opts.identityByNode.set(chainNode, req.identity)
        out.push(req)
        if (AST.isViewDeclaration(chainNode)) {
          enqueueRenderedViews(chainNode, queued)
        }
      }
    }
  }
  return out.sort((a, b) => a.identity.localeCompare(b.identity))
}

function enqueueRenderedViews(view: AST.ViewDeclaration, queued: TaoViewLikeDeclaration[]): void {
  for (const node of AST.Utils.streamAllContents(view)) {
    if (AST.isRenderStatement(node) || AST.isViewRender(node)) {
      const ref = node.view?.ref
      if (isViewLikeDeclaration(ref)) {
        queued.push(ref)
      }
    }
  }
}

function designRequirementForNode(node: TaoViewLikeDeclaration, opts: {
  appDesignDescription: string
  appPaletteSeed: string
  entryAbsolutePath: string
  stdLibRoot?: string
}): DesignRequirement {
  const sourceIdentity = sourceIdentityForNode(node, opts.entryAbsolutePath, opts.stdLibRoot)
  const spec = designSpecDescription(node)
  const chain = variantTargetChain(node)
  const root = resolveVariantTargetView(node) ?? (AST.isViewDeclaration(node) ? node : undefined)
  const rootName = root?.name ?? node.name
  const description = spec ?? ''
  const designSpecIdentity = `${sourceIdentity}|app:${opts.appDesignDescription}|spec:${description}`
  const input = {
    analyzerVersion: TAO_DESIGN_ANALYZER_VERSION,
    appDesignDescription: opts.appDesignDescription,
    declarationKind: AST.isVariantDeclaration(node) ? 'variant' : node.type,
    designSpec: description,
    name: node.name,
    rootKind: root?.type ?? 'unknown',
    rootName,
    schemaVersion: TAO_DESIGN_SCHEMA_VERSION,
    sourceIdentity,
    variantChain: chain.map(c => c.name),
  }
  return {
    appPaletteSeed: opts.appPaletteSeed,
    description,
    designSpecIdentity,
    identity: sourceIdentity,
    input,
    inputHash: designInputHash(input),
    kind: AST.isVariantDeclaration(node) ? 'variant' : node.type,
    node,
    rootName,
    sourceIdentity,
    variantChain: chain.map(c => c.name),
  }
}

function generateDesignEntry(req: DesignRequirement, status: TaoDesignStatus): TaoDesignLockEntry {
  const inference = inferComposite(req)
  const resolved = resolvedPayload(req, inference)
  const semantic = {
    compositeRole: inference.compositeRole,
    confidence: inference.confidence,
    description: req.description,
    designSpecIdentity: req.designSpecIdentity,
    rationale: inference.rationale,
    role: inference.role,
    sourceIdentity: req.sourceIdentity,
  }
  return {
    identity: req.identity,
    inputHash: req.inputHash,
    provenance: {
      analyzerVersion: TAO_DESIGN_ANALYZER_VERSION,
      chosenRole: inference.role,
      compositeRole: inference.compositeRole,
      confidence: inference.confidence,
      designSpecIdentity: req.designSpecIdentity,
      inputHash: req.inputHash,
      model: 'deterministic-local',
      rationale: inference.rationale,
      sourceIdentity: req.sourceIdentity,
    },
    resolved,
    semantic,
    status,
  }
}

function inferComposite(req: DesignRequirement): {
  role: string
  compositeRole: string
  confidence: number
  rationale: string
} {
  const text = `${req.rootName} ${req.variantChain.join(' ')} ${req.description}`.toLowerCase()
  const warningLike = hasDesignWord(text, 'warning') || hasDesignWord(text, 'risk')
    || hasDesignWord(text, 'attention')
  const destructiveLike = hasDesignWord(text, 'danger') || hasDesignWord(text, 'destructive')
  const actionLike = req.rootName === 'Button' || hasDesignWord(text, 'action')
  const surfaceLike = req.rootName === 'Box' || hasDesignWord(text, 'card') || hasDesignWord(text, 'surface')
    || hasDesignWord(text, 'panel')
  if (isStructural(req.rootName)) {
    return {
      compositeRole: 'composite.layout.structural',
      confidence: req.description ? 0.72 : 0.52,
      rationale: `Mapped ${req.rootName} to structural layout role.`,
      role: 'structural layout',
    }
  }
  if (warningLike && surfaceLike && !actionLike) {
    return role('warning surface', 'composite.surface.warning', req.description)
  }
  if (destructiveLike && actionLike) {
    return role('destructive action', 'composite.action.danger', req.description)
  }
  if (warningLike && actionLike) {
    return role('warning action', 'composite.action.warning', req.description)
  }
  if (
    actionLike
    && (hasDesignWord(text, 'secondary') || hasDesignWord(text, 'quiet') || hasDesignWord(text, 'supporting'))
  ) {
    return role('secondary action', 'composite.action.secondary', req.description)
  }
  if (actionLike) {
    return role('primary action', 'composite.action.primary', req.description)
  }
  if (req.rootName === 'TextInput' || hasDesignWord(text, 'input') || text.includes('entry field')) {
    return role('text input field', 'composite.input.field', req.description)
  }
  if (req.rootName === 'Number' || hasDesignWord(text, 'metric') || hasDesignWord(text, 'number')) {
    return role('metric text', 'composite.text.metric', req.description)
  }
  if (
    req.rootName.includes('Text') || hasDesignWord(text, 'copy') || hasDesignWord(text, 'label')
    || hasDesignWord(text, 'text')
  ) {
    const supporting = hasDesignWord(text, 'muted') || hasDesignWord(text, 'supporting')
      || hasDesignWord(text, 'label')
    return role(
      supporting ? 'supporting text' : 'body text',
      supporting ? 'composite.text.supporting' : 'composite.text.body',
      req.description,
    )
  }
  if (warningLike) {
    return role('warning surface', 'composite.surface.warning', req.description)
  }
  if (surfaceLike) {
    return role('card surface', 'composite.surface.card', req.description)
  }
  return {
    compositeRole: 'composite.surface.plain',
    confidence: req.description ? 0.66 : 0.48,
    rationale: `Used conservative plain-surface role for ${req.rootName}.`,
    role: 'plain surface',
  }
}

function role(roleName: string, compositeRole: string, description: string) {
  return {
    compositeRole,
    confidence: description ? 0.84 : 0.68,
    rationale: description ? 'Matched design spec and declaration identity.' : 'Matched declaration identity.',
    role: roleName,
  }
}

function resolvedPayload(req: DesignRequirement, inference: { compositeRole: string }): TaoDesignResolvedPayload {
  const palette = paletteForSeed(req.appPaletteSeed)
  const baseStyle = baseStyleForComposite(inference.compositeRole, palette)
  const adaptations = compactDesignObject({
    colorScheme: {
      dark: darkStyleForComposite(inference.compositeRole, palette),
    },
  })
  const states = compactDesignObject(stateStylesForComposite(inference.compositeRole, palette) ?? {})
  return {
    ...(Object.keys(adaptations).length > 0 ? { adaptations } : {}),
    baseStyle,
    compositeRole: inference.compositeRole,
    ...(Object.keys(states).length > 0 ? { states } : {}),
    styleKey: `style.${slug(req.identity)}`,
  }
}

function baseStyleForComposite(
  composite: string,
  palette: ReturnType<typeof paletteForSeed>,
): Record<string, TaoDesignJson> {
  if (composite.startsWith('composite.action.')) {
    const bg = composite.endsWith('.danger')
      ? '#b42318'
      : composite.endsWith('.warning')
      ? '#b54708'
      : composite.endsWith('.secondary')
      ? palette.secondaryBackground
      : palette.primary
    const fg = composite.endsWith('.secondary') ? palette.secondaryText : '#ffffff'
    return {
      backgroundColor: bg,
      borderColor: composite.endsWith('.secondary') ? palette.primary : bg,
      borderRadius: 8,
      borderWidth: 1,
      color: fg,
      paddingHorizontal: 12,
      paddingVertical: 8,
    }
  }
  if (composite === 'composite.input.field') {
    return {
      backgroundColor: palette.surfaceBackground,
      borderColor: palette.secondaryBorder,
      borderRadius: 8,
      borderWidth: 1,
      color: palette.bodyText,
      fontSize: 16,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
    }
  }
  if (composite === 'composite.text.metric') {
    return { color: palette.primaryText, fontSize: 28, fontWeight: '700' }
  }
  if (composite === 'composite.text.supporting') {
    return { color: palette.supportingText, fontSize: 13, fontWeight: '500' }
  }
  if (composite === 'composite.text.body') {
    return { color: palette.bodyText, fontSize: 16 }
  }
  if (composite === 'composite.surface.warning') {
    return { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderRadius: 8, borderWidth: 1 }
  }
  if (composite === 'composite.surface.card') {
    return {
      backgroundColor: palette.surfaceBackground,
      borderColor: palette.surfaceBorder,
      borderRadius: 8,
      borderWidth: 1,
    }
  }
  return {}
}

function darkStyleForComposite(
  composite: string,
  palette: ReturnType<typeof paletteForSeed>,
): Record<string, TaoDesignJson> {
  if (composite.startsWith('composite.action.')) {
    return composite.endsWith('.secondary')
      ? { backgroundColor: palette.darkSecondaryBackground, borderColor: palette.darkPrimary, color: '#f8fafc' }
      : { backgroundColor: palette.darkPrimary, borderColor: palette.darkPrimary, color: '#ffffff' }
  }
  if (composite === 'composite.input.field') {
    return {
      backgroundColor: palette.darkSurfaceBackground,
      borderColor: palette.darkSecondaryBorder,
      color: '#f8fafc',
    }
  }
  if (composite.startsWith('composite.text.')) {
    return { color: composite === 'composite.text.supporting' ? palette.darkSupportingText : '#f8fafc' }
  }
  if (composite === 'composite.surface.warning') {
    return { backgroundColor: '#431407', borderColor: '#9a3412' }
  }
  if (composite === 'composite.surface.card') {
    return { backgroundColor: palette.darkSurfaceBackground, borderColor: palette.darkSurfaceBorder }
  }
  return {}
}

function stateStylesForComposite(
  composite: string,
  _palette: ReturnType<typeof paletteForSeed>,
): Record<string, TaoDesignJson> | undefined {
  if (!composite.startsWith('composite.action.') && composite !== 'composite.input.field') {
    return undefined
  }
  return {
    disabled: { opacity: 0.45 },
    focused: { borderWidth: 2 },
    pressed: composite.startsWith('composite.action.') ? { opacity: 0.82 } : {},
    selected: composite.startsWith('composite.action.') ? { borderWidth: 2 } : {},
  }
}

function paletteForSeed(seed: string) {
  const hue = Number.parseInt(designInputHash(seed).slice(0, 8), 16) % 360
  return {
    darkPrimary: hslToHex(hue, 56, 52),
    darkSecondaryBackground: hslToHex(hue, 36, 18),
    darkSecondaryBorder: hslToHex(hue, 32, 34),
    darkSupportingText: hslToHex(hue, 18, 78),
    darkSurfaceBackground: hslToHex(hue, 30, 12),
    darkSurfaceBorder: hslToHex(hue, 26, 28),
    bodyText: '#1f2937',
    primary: hslToHex(hue, 62, 38),
    primaryText: hslToHex(hue, 50, 30),
    secondaryBackground: hslToHex(hue, 42, 96),
    secondaryBorder: hslToHex(hue, 34, 78),
    secondaryText: hslToHex(hue, 42, 26),
    supportingText: hslToHex(hue, 20, 44),
    surfaceBackground: hslToHex(hue, 28, 98),
    surfaceBorder: hslToHex(hue, 24, 86),
  }
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

function appPaletteSeedFor(opts: {
  app: AST.AppDeclaration | undefined
  appDesignDescription: string
  entryAbsolutePath: string
}): string {
  return designInputHash({
    appDesignDescription: opts.appDesignDescription,
    appName: opts.app?.name ?? '',
    entryFile: FS.basename(opts.entryAbsolutePath),
    schemaVersion: TAO_DESIGN_SCHEMA_VERSION,
  })
}

function hslToHex(h: number, s: number, l: number): string {
  const light = l / 100
  const sat = s / 100
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function requirementForProvider(req: DesignRequirement): TaoDesignRequirement {
  return {
    description: req.description,
    designSpecIdentity: req.designSpecIdentity,
    identity: req.identity,
    input: req.input,
    inputHash: req.inputHash,
    kind: req.kind,
    rootName: req.rootName,
    sourceIdentity: req.sourceIdentity,
    variantChain: req.variantChain,
  }
}

function sourceIdentityForNode(
  node: TaoViewLikeDeclaration,
  entryAbsolutePath: string,
  stdLibRoot: string | undefined,
): string {
  const doc = LGM.AstUtils.getDocument(node)
  const fsPath = doc.uri.fsPath
  if (stdLibRoot && FS.normalizePath(fsPath).startsWith(FS.normalizePath(stdLibRoot + FS.sep))) {
    const rel = FS.relativePathWithPosixSlashes(stdLibRoot, fsPath).replace(/\.tao$/i, '')
    return `@tao/${rel.replace(/^tao\//, '')}#${node.name}`
  }
  const rel = FS.relativePathWithPosixSlashes(FS.dirname(entryAbsolutePath), fsPath).replace(/\.tao$/i, '')
  return `app/${rel}#${node.name}`
}

function appDesignDescriptionOf(app: AST.AppDeclaration | undefined): string {
  const design = app?.appStatements.find(AST.isAppDesignBlock)
  return stringTemplateTextOnlyLiteral(design?.description.value) ?? ''
}

function designSpecDescription(node: TaoViewLikeDeclaration): string | undefined {
  return stringTemplateTextOnlyLiteral(node.designSpec?.description)
}

function findEntryAppDeclaration(mainTaoFile: AST.TaoFile): AST.AppDeclaration | undefined {
  for (const stmt of mainTaoFile.statements) {
    const decl = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
    if (AST.isAppDeclaration(decl)) {
      return decl
    }
  }
  return undefined
}

function dedupeTaoFilesByUri(files: AST.TaoFile[]): AST.TaoFile[] {
  const byUri = new Map<string, AST.TaoFile>()
  for (const file of files) {
    const uri = file.$document?.uri.toString()
    if (uri !== undefined && !byUri.has(uri)) {
      byUri.set(uri, file)
    }
  }
  return [...byUri.values()]
}

function isStructural(rootName: string): boolean {
  return rootName === 'Row' || rootName === 'Col' || rootName === 'Stack' || rootName === 'Box'
    || rootName === 'WrappingRow'
}

function hasDesignWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(text)
}

function slug(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/(^\.+|\.+$)/g, '')
    .toLowerCase()
}
