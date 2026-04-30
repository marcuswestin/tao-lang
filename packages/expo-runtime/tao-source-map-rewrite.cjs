'use strict'

// Tao source-map pipeline: this file rewrites **bundle** v3 JSON maps so DevTools sees `.tao` originals.
// Compiler-side Langium trace → v3 lives in packages/compiler (traceToSourceMapJson). Overview:
// Docs/Projects/SourceMapping.md

const fs = require('fs')
const path = require('path')
const { fileURLToPath } = require('node:url')
const { decode, encode } = require('@jridgewell/sourcemap-codec')
const { TraceMap, originalPositionFor } = require('@jridgewell/trace-mapping')

const SOURCE_MAP_VERSION = 3
/** Decoded VLQ segments need at least [genCol, sourcesIndex, origLine, origCol]. */
const DECODED_SEGMENT_MIN_FIELDS = 4

const WEBPACK_VIRTUAL_SCHEME = 'webpack:///'
const WEBPACK_RELATIVE_PREFIX = './'

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/** stripWebpackVirtualPrefix turns `webpack:///./foo` into `foo` for filesystem resolution. */
function stripWebpackVirtualPrefix(sourcePath) {
  if (!sourcePath.startsWith(WEBPACK_VIRTUAL_SCHEME)) {
    return sourcePath
  }
  let s = sourcePath.slice(WEBPACK_VIRTUAL_SCHEME.length)
  if (s.startsWith(WEBPACK_RELATIVE_PREFIX)) {
    s = s.slice(WEBPACK_RELATIVE_PREFIX.length)
  }
  return s
}

/** isGeneratedTaoAppTsx returns true when `absPath` is a `.tsx` file inside `genDirNorm`. */
function isGeneratedTaoAppTsx(absPath, genDirNorm) {
  const norm = path.normalize(absPath)
  if (!norm.endsWith('.tsx')) {
    return false
  }
  const rel = path.relative(genDirNorm, norm)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** normalizeBundleSourceToFsPath resolves a bundle `sources[]` entry to an absolute path, or null. */
function normalizeBundleSourceToFsPath(source, genDirNorm) {
  if (!source || typeof source !== 'string') {
    return null
  }

  let s = source.split('?')[0]
  s = stripWebpackVirtualPrefix(s)
  if (s.startsWith('file://')) {
    try {
      s = fileURLToPath(s)
    } catch {
      return null
    }
  }
  if (path.isAbsolute(s)) {
    return path.normalize(s)
  }

  for (const base of [process.cwd(), path.dirname(genDirNorm)]) {
    const resolved = path.resolve(base, s)
    if (fs.existsSync(resolved)) {
      return path.normalize(resolved)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Compiler source map loading
// ---------------------------------------------------------------------------

/** pickTaoSourceFromCompilerMap returns `{ taoPath, taoContent }` from a per-module compiler v3 map. */
function pickTaoSourceFromCompilerMap(compilerMap) {
  const { sources, sourcesContent } = compilerMap
  if (!Array.isArray(sources) || sources.length === 0) {
    return null
  }

  let idx = sources.findIndex((src) => typeof src === 'string' && /\.tao$/i.test(src))
  if (idx < 0) {
    idx = 0
  }

  const taoPath = sources[idx]
  if (typeof taoPath !== 'string') {
    return null
  }

  const taoContent = Array.isArray(sourcesContent) && typeof sourcesContent[idx] === 'string'
    ? sourcesContent[idx]
    : null
  return { taoPath, taoContent }
}

/** loadCompilerMapForTsx reads the sibling `.tsx.map`, parses it, and returns `{ picked, traceMap }` or null. */
function loadCompilerMapForTsx(absPath, traceMapCache) {
  const siblingMap = `${absPath}.map`
  if (!fs.existsSync(siblingMap) || !fs.statSync(siblingMap).isFile()) {
    return null
  }

  let compilerMap
  try {
    compilerMap = JSON.parse(fs.readFileSync(siblingMap, 'utf8'))
  } catch {
    return null
  }

  const picked = pickTaoSourceFromCompilerMap(compilerMap)
  if (!picked) {
    return null
  }

  let traceMap = traceMapCache.get(siblingMap)
  if (!traceMap) {
    try {
      traceMap = new TraceMap(compilerMap)
    } catch {
      return null
    }
    traceMapCache.set(siblingMap, traceMap)
  }

  return { picked, traceMap }
}

// ---------------------------------------------------------------------------
// Segment remapping
// ---------------------------------------------------------------------------

/** remapSegmentsThroughCompilerMap rewrites decoded segments for `sourceIndex` from TSX line/col → Tao line/col. */
function remapSegmentsThroughCompilerMap(decoded, sourceIndex, compilerTraceMap) {
  for (const line of decoded) {
    for (const seg of line) {
      if (seg.length < DECODED_SEGMENT_MIN_FIELDS || seg[1] !== sourceIndex) {
        continue
      }

      // Bundle mappings use 0-based lines; `originalPositionFor` expects 1-based.
      const pos = originalPositionFor(compilerTraceMap, {
        line: seg[2] + 1,
        column: seg[3],
      })
      if (pos.source == null || pos.line == null || pos.column == null) {
        continue
      }

      // Write back 0-based original line for the bundle codec.
      seg[2] = pos.line - 1
      seg[3] = pos.column
      if (seg.length === 5) {
        seg.pop()
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry: rewriteBundleMapSources
// ---------------------------------------------------------------------------

/** ensureSourcesContentPadded pads `sourcesContent` with nulls to match `sources` length. */
function ensureSourcesContentPadded(map) {
  if (!Array.isArray(map.sourcesContent)) {
    map.sourcesContent = []
  }
  while (map.sourcesContent.length < map.sources.length) {
    map.sourcesContent.push(null)
  }
}

/** rewriteBundleMapSources rewrites a Metro/Expo bundle source map: for each generated `.tsx` under `genDir`,
 * loads the sibling compiler `.tsx.map`, remaps bundle segments TSX→Tao, then swaps in `.tao` paths and source content. */
function rewriteBundleMapSources(mapJsonString, genDir) {
  const genDirNorm = path.normalize(genDir)
  let map
  try {
    map = JSON.parse(mapJsonString)
  } catch {
    return mapJsonString
  }
  if (!map || map.version !== SOURCE_MAP_VERSION || !Array.isArray(map.sources)) {
    return mapJsonString
  }

  ensureSourcesContentPadded(map)

  const traceMapCache = new Map()
  const remapEntries = collectRemapEntries(map.sources, genDirNorm, traceMapCache)

  remapBundleMappings(map, remapEntries)
  swapSourcePaths(map, remapEntries)

  return JSON.stringify(map)
}

/** collectRemapEntries identifies which bundle source indices point to generated Tao TSX files and loads their compiler maps. */
function collectRemapEntries(sources, genDirNorm, traceMapCache) {
  const entries = []
  for (let i = 0; i < sources.length; i++) {
    const abs = normalizeBundleSourceToFsPath(sources[i], genDirNorm)
    if (!abs || !isGeneratedTaoAppTsx(abs, genDirNorm)) {
      continue
    }

    const loaded = loadCompilerMapForTsx(abs, traceMapCache)
    if (!loaded) {
      continue
    }

    entries.push({ i, picked: loaded.picked, traceMap: loaded.traceMap })
  }
  return entries
}

/** remapBundleMappings decodes the bundle mappings, remaps each Tao source's segments, and re-encodes. */
function remapBundleMappings(map, remapEntries) {
  if (remapEntries.length === 0 || typeof map.mappings !== 'string' || map.mappings.length === 0) {
    return
  }
  try {
    const decoded = decode(map.mappings)
    for (const { i, traceMap } of remapEntries) {
      remapSegmentsThroughCompilerMap(decoded, i, traceMap)
    }
    map.mappings = encode(decoded)
  } catch { /* keep original mappings */ }
}

/** swapSourcePaths replaces bundle source paths and content with the original `.tao` paths and content. */
function swapSourcePaths(map, remapEntries) {
  for (const { i, picked } of remapEntries) {
    map.sources[i] = picked.taoPath
    if (picked.taoContent !== null) {
      map.sourcesContent[i] = picked.taoContent
    }
  }
}

module.exports = { rewriteBundleMapSources }
