import * as GenMapping from '@jridgewell/gen-mapping'
import type { TraceRegion } from '@parser/generate'
import { fileURLToPath } from 'node:url'

import { FS } from '@shared'

/** TraceToSourceMapOpts configures building a v3 source map from a Langium trace tree. */
export type TraceToSourceMapOpts = {
  /** Absolute path of the emitted generated file (used for `file`; Tao roots use absolute POSIX paths in `sources`). */
  outputAbsolutePath: string
  /** Root trace from `toStringAndTrace` (Langium `TraceRegion` tree). */
  trace: TraceRegion
  /** When true, embed each Tao source in `sourcesContent` when the file exists. Defaults to true. */
  embedSourcesContent?: boolean
}

type TraceRegionWithRegions = TraceRegion & {
  sourceRegion: NonNullable<TraceRegion['sourceRegion']>
  targetRegion: NonNullable<TraceRegion['targetRegion']> & {
    range: NonNullable<NonNullable<TraceRegion['targetRegion']>['range']>
  }
}

// ---------------------------------------------------------------------------
// Pipeline: traceToEncodedSourceMapJson
// Full stack (compiler trace → per-module .map → Metro bundle rewrite): Docs/Projects/SourceMapping.md
// ---------------------------------------------------------------------------

/** traceToEncodedSourceMapJson builds a Source Map v3 JSON string from a Langium `TraceRegion` tree. */
export function traceToEncodedSourceMapJson(opts: TraceToSourceMapOpts): string {
  const embedSources = opts.embedSourcesContent !== false
  const outputBasename = FS.basename(opts.outputAbsolutePath)
  const inheritedUri = assignInheritedSourceFileUris(opts.trace)

  const regions = filterValidRegions(collectTraceRegions(opts.trace))
  const picked = deduplicateMostSpecificPerPosition(regions)

  const map = new GenMapping.GenMapping({ file: outputBasename })
  const resolvedPaths = addSegmentsToMap(map, picked, inheritedUri)

  if (embedSources) {
    embedSourceContents(map, resolvedPaths)
  }

  return JSON.stringify(GenMapping.toEncodedMap(map))
}

/** appendSourceMappingUrlPragma appends a trailing `//# sourceMappingURL=` for a co-located `.map` file. */
export function appendSourceMappingUrlPragma(tsSource: string, mapBasename: string): string {
  const pragma = `//# sourceMappingURL=${mapBasename}`
  const trimmed = tsSource.replace(/\s*$/, '')
  return `${trimmed}\n${pragma}\n`
}

// ---------------------------------------------------------------------------
// Stage: Inherited URIs
// ---------------------------------------------------------------------------

/** assignInheritedSourceFileUris walks the trace tree and records each region's effective Tao `fileURI` (Langium omits it on nested nodes). */
function assignInheritedSourceFileUris(root: TraceRegion): Map<TraceRegion, string> {
  const effectiveUri = new Map<TraceRegion, string>()
  function walk(n: TraceRegion, inherited: string | undefined) {
    const sr = n.sourceRegion
    const uri = sr?.fileURI ?? inherited
    if (sr && uri) {
      effectiveUri.set(n, uri)
    }
    for (const c of n.children ?? []) {
      walk(c, uri)
    }
  }
  walk(root, undefined)
  return effectiveUri
}

// ---------------------------------------------------------------------------
// Stage: Collect & filter
// ---------------------------------------------------------------------------

/** collectTraceRegions walks `root` and returns every `TraceRegion` in pre-order. */
function collectTraceRegions(root: TraceRegion): TraceRegion[] {
  const out: TraceRegion[] = []
  function walk(n: TraceRegion) {
    out.push(n)
    for (const c of n.children ?? []) {
      walk(c)
    }
  }
  walk(root)
  return out
}

/** filterValidRegions keeps only regions that have both a sourceRegion and a target start position. */
function filterValidRegions(regions: TraceRegion[]): TraceRegionWithRegions[] {
  return regions.filter(
    (r): r is TraceRegionWithRegions =>
      Boolean(
        r.sourceRegion
          && r.targetRegion?.length
          && r.targetRegion.range
          && r.targetRegion.range.start != null,
      ),
  )
}

// ---------------------------------------------------------------------------
// Stage: Deduplicate
// ---------------------------------------------------------------------------

/** compareByTargetStart sorts regions by generated line, then column. */
function compareByTargetStart(a: TraceRegionWithRegions, b: TraceRegionWithRegions): number {
  const sa = a.targetRegion.range.start
  const sb = b.targetRegion.range.start
  if (sa.line !== sb.line) {
    return sa.line - sb.line
  }
  return sa.character - sb.character
}

/** sourceSpanLength returns the source-side span length (smaller = more specific). */
function sourceSpanLength(r: TraceRegionWithRegions): number {
  const sr = r.sourceRegion
  if (typeof sr.length === 'number' && sr.length > 0) {
    return sr.length
  }
  if (typeof sr.end === 'number' && typeof sr.offset === 'number') {
    return Math.max(0, sr.end - sr.offset)
  }
  return Number.MAX_SAFE_INTEGER
}

/** deduplicateMostSpecificPerPosition picks the most specific source region for each unique generated start position. */
function deduplicateMostSpecificPerPosition(regions: TraceRegionWithRegions[]): TraceRegionWithRegions[] {
  const bestByKey = new Map<string, TraceRegionWithRegions>()
  for (const r of regions) {
    const s = r.targetRegion.range.start
    const key = `${s.line}:${s.character}`
    const prev = bestByKey.get(key)
    if (!prev || sourceSpanLength(r) < sourceSpanLength(prev)) {
      bestByKey.set(key, r)
    }
  }
  return [...bestByKey.values()].sort(compareByTargetStart)
}

// ---------------------------------------------------------------------------
// Stage: Emit mapping segments
// ---------------------------------------------------------------------------

/** resolveFileUri converts a `file://` URI to an absolute filesystem path, or undefined on failure. */
function resolveFileUri(uri: string): string | undefined {
  try {
    return fileURLToPath(uri)
  } catch {
    return undefined
  }
}

/** toPosixPath converts backslashes to forward slashes for source map `sources` keys. */
function toPosixPath(absolutePath: string): string {
  return absolutePath.replace(/\\/g, '/')
}

/** addSegmentsToMap emits one mapping segment per picked region and returns the set of resolved absolute Tao source paths. */
function addSegmentsToMap(
  map: GenMapping.GenMapping,
  picked: TraceRegionWithRegions[],
  inheritedUri: Map<TraceRegion, string>,
): Set<string> {
  const sourceTextCache = new Map<string, string>()
  const resolvedPaths = new Set<string>()

  for (const r of picked) {
    const uri = r.sourceRegion.fileURI ?? inheritedUri.get(r)
    if (!uri) {
      continue
    }
    const absPath = resolveFileUri(uri)
    if (!absPath) {
      continue
    }

    const orig = originalLineColumn(r.sourceRegion, absPath, sourceTextCache)
    if (!orig) {
      continue
    }

    const gen = r.targetRegion.range.start
    GenMapping.addSegment(map, gen.line, gen.character, toPosixPath(absPath), orig.line, orig.column)
    resolvedPaths.add(absPath)
  }

  return resolvedPaths
}

/** embedSourceContents reads each Tao source file and embeds it in `sourcesContent`. */
function embedSourceContents(map: GenMapping.GenMapping, resolvedPaths: Set<string>): void {
  for (const abs of resolvedPaths) {
    if (!FS.isFile(abs)) {
      continue
    }
    GenMapping.setSourceContent(map, toPosixPath(abs), FS.readTextFile(abs))
  }
}

// ---------------------------------------------------------------------------
// Helpers: offset ↔ line/column
// ---------------------------------------------------------------------------

/** originalLineColumn resolves 0-based line and column in Tao source for `sourceRegion`. */
function originalLineColumn(
  sourceRegion: NonNullable<TraceRegion['sourceRegion']>,
  absoluteSourcePath: string,
  cache: Map<string, string>,
): { line: number; column: number } | undefined {
  const r = sourceRegion.range
  if (r?.start) {
    return { line: r.start.line, column: r.start.character }
  }
  let text = cache.get(absoluteSourcePath)
  if (text === undefined && FS.isFile(absoluteSourcePath)) {
    text = FS.readTextFile(absoluteSourcePath)
    cache.set(absoluteSourcePath, text)
  }
  if (text === undefined) {
    return undefined
  }
  return offsetToLineColumn(text, sourceRegion.offset)
}

/** offsetToLineColumn returns 0-based line and column for string offset `offset` in `text`. */
function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 0
  let lineStart = 0
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      lineStart = i + 1
    }
  }
  const column = offset - lineStart
  return { line, column: Math.max(0, column) }
}
