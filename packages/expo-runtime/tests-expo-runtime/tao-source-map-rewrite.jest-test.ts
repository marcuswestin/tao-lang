import { afterEach, describe, expect, test } from '@jest/globals'
import { decode, encode } from '@jridgewell/sourcemap-codec'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { rewriteBundleMapSources } from '../tao-source-map-rewrite.cjs'

type V3Map = { version: 3; file: string; sources: string[]; sourcesContent: string[]; mappings: string }

/** setupGenFixture creates a tmp dir with a generated TSX file, its sibling compiler .map, and returns paths + cleanup info. */
function setupGenFixture(opts: { prefix: string; name: string; taoText: string; compilerMappings: string }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), opts.prefix))
  const genDir = path.join(tmp, '_gen', 'tao-app', 'app')
  fs.mkdirSync(genDir, { recursive: true })
  const tsxPath = path.join(genDir, `${opts.name}.tsx`)
  const taoPath = path.join(tmp, 'Apps', `${opts.name}.tao`)

  fs.writeFileSync(tsxPath, '// generated tsx\n', 'utf8')

  const compilerMap: V3Map = {
    version: 3,
    file: `${opts.name}.tsx`,
    sources: [taoPath],
    sourcesContent: [opts.taoText],
    mappings: opts.compilerMappings,
  }
  fs.writeFileSync(`${tsxPath}.map`, JSON.stringify(compilerMap), 'utf8')

  return { tmp, genDir: path.join(tmp, '_gen', 'tao-app'), tsxPath, taoPath, taoText: opts.taoText }
}

describe('rewriteBundleMapSources', () => {
  let tmp: string | undefined

  afterEach(() => {
    if (tmp && fs.existsSync(tmp)) {
      fs.rmSync(tmp, { recursive: true, force: true })
      tmp = undefined
    }
  })

  test('rewrites _gen/tao-app .tsx sources using sibling .tsx.map', () => {
    const fixture = setupGenFixture({
      prefix: 'tao-map-rewrite-',
      name: 'Kitchen',
      taoText: 'app Kitchen { view Root { } }',
      compilerMappings: 'AAAA',
    })
    tmp = fixture.tmp

    const bundle = {
      version: 3,
      sources: [fixture.tsxPath],
      sourcesContent: ['tsx placeholder'],
      mappings: ';;;',
    }
    const out = JSON.parse(rewriteBundleMapSources(JSON.stringify(bundle), fixture.genDir))
    expect(out.sources[0]).toBe(fixture.taoPath)
    expect(out.sourcesContent[0]).toBe(fixture.taoText)
  })

  test('returns original string when JSON is not a v3 map', () => {
    expect(rewriteBundleMapSources('not json', '/tmp/x')).toBe('not json')
  })

  test('remaps bundle mapping segments from TSX line/col to Tao via sibling compiler map', () => {
    const compilerDecoded = Array.from({ length: 11 }, () => [] as number[][])
    compilerDecoded[10] = [[0, 0, 2, 0]]

    const fixture = setupGenFixture({
      prefix: 'tao-map-remap-',
      name: 'Mod',
      taoText: 'one\ntwo\nthree',
      compilerMappings: encode(compilerDecoded as unknown as Parameters<typeof encode>[0]),
    })
    tmp = fixture.tmp

    const bundleDecoded = Array.from({ length: 11 }, () => [] as number[][])
    bundleDecoded[10] = [[0, 0, 10, 0]]

    const bundle = {
      version: 3,
      sources: [fixture.tsxPath],
      sourcesContent: ['tsx'],
      mappings: encode(bundleDecoded as unknown as Parameters<typeof encode>[0]),
    }
    const out = JSON.parse(rewriteBundleMapSources(JSON.stringify(bundle), fixture.genDir))
    expect(out.sources[0]).toBe(fixture.taoPath)
    const outLines = decode(out.mappings as string)
    expect(outLines[10][0][2]).toBe(2)
    expect(outLines[10][0][3]).toBe(0)
  })
})
