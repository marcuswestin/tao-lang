import { eachMapping, originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import type { TraceRegion } from '@parser/generate'
import { afterEach, describe, expect, test } from 'bun:test'

import { FS } from '@shared'
import { compileTao } from '../compiler-src/compiler-main'
import { appendSourceMappingUrlPragma, traceToEncodedSourceMapJson } from '../compiler-src/trace-to-source-map'

type V3Map = { version: number; file: string; sources: string[]; sourcesContent?: (string | null)[]; mappings: string }

/** buildSyntheticTrace creates a root TraceRegion with one child mapping [0,length) in both source and target. */
function buildSyntheticTrace(fileURI: string, length: number): TraceRegion {
  const region = {
    offset: 0,
    end: length,
    length,
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: length } },
  }
  return {
    targetRegion: region,
    children: [{ sourceRegion: { fileURI, ...region }, targetRegion: region }],
  }
}

describe('traceToEncodedSourceMapJson', () => {
  let tmpDir: string | undefined

  afterEach(() => {
    if (tmpDir) {
      FS.rmDirectory(tmpDir)
      tmpDir = undefined
    }
  })

  test('produces v3 map with mappings and absolute POSIX Tao paths in sources from a synthetic TraceRegion', () => {
    tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-trace-sm-XXXXXX'))
    const taoPath = FS.joinPath(tmpDir, 'app.tao')
    const taoText = 'app X { ui V }\nview V {}\n'
    FS.writeFile(taoPath, taoText)

    const root = buildSyntheticTrace(FS.pathToFileURL(taoPath).href, 6)

    const outTsPath = FS.joinPath(tmpDir, 'tao-app', 'out.tsx')
    FS.mkdir(FS.dirname(outTsPath))
    const json = traceToEncodedSourceMapJson({ outputAbsolutePath: outTsPath, trace: root })
    const map = JSON.parse(json) as V3Map

    expect(map.version).toBe(3)
    expect(map.file).toBe('out.tsx')
    expect(map.sources.length).toBeGreaterThanOrEqual(1)
    expect(map.sources[0]).toMatch(/app\.tao$/)
    expect(map.mappings.length).toBeGreaterThan(0)
    expect(map.sourcesContent?.[0]).toBe(taoText)

    const tracer = new TraceMap(JSON.parse(json))
    const orig = originalPositionFor(tracer, { line: 1, column: 0 })
    expect(orig.source).toBe(map.sources[0])
    expect(orig.line).toBe(1)
    expect(orig.column).toBe(0)
  })

  test('appendSourceMappingUrlPragma appends co-located map reference', () => {
    const out = appendSourceMappingUrlPragma('export {}\n', 'out.tsx.map')
    expect(out.trimEnd().endsWith(`//# sourceMappingURL=out.tsx.map`)).toBe(true)
  })

  test.todo('DevApp compile emits a v3 source map JSON from Langium trace', async () => {
    const taoPath = FS.resolvePath(FS.joinPath(__dirname, '../../../Apps/DevApp/DevApp.tao'))
    const taoSource = FS.readTextFile(taoPath)
    const debuggerLine1Based = taoSource.split('\n').findIndex((line) => line.trimStart().startsWith('debugger')) + 1
    expect(debuggerLine1Based).toBeGreaterThan(0)

    const stdLibRoot = FS.resolvePath(FS.joinPath(__dirname, '../../../packages/tao-std-lib'))
    const result = await compileTao({ file: taoPath, stdLibRoot })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const devApp = result.files.find((f) => f.relativePath.endsWith('DevApp.tsx'))
    expect(devApp?.trace).toBeDefined()

    const json = traceToEncodedSourceMapJson({
      outputAbsolutePath: FS.joinPath(FS.tmpdir(), 'DevApp.tsx'),
      trace: devApp!.trace!,
    })
    const map = JSON.parse(json) as V3Map
    expect(map.version).toBe(3)
    expect(map.sources[0]).toMatch(/DevApp\.tao$/)
    expect(map.mappings.length).toBeGreaterThan(0)

    const tracer = new TraceMap(json)
    let segCount = 0
    eachMapping(tracer, () => {
      segCount++
    })
    expect(segCount).toBeGreaterThanOrEqual(3)

    const taoOrigLines = new Set<number>()
    eachMapping(tracer, (m) => {
      if (m.originalLine != null) {
        taoOrigLines.add(m.originalLine)
      }
    })
    expect(taoOrigLines.has(debuggerLine1Based)).toBe(true)

    const orig = originalPositionFor(tracer, { line: 1, column: 0 })
    expect(orig.source).toBeTruthy()
  })
})
