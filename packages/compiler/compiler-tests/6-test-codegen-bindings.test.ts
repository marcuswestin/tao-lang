// Codegen-string assertions for the call-site argument binding pipeline. The compiler is exercised
// end-to-end via `compileTao`, then we slice the bootstrap-output module text and look for the resolved
// JSX prop / runtime-call key. These tests pin the **emission** (not just typing) so by-type matching
// stays runtime-correct.

import { compileTao } from '@compiler/compiler-main'
import { FS } from '@shared'
import {
  SNIPPET_MINIMAL_BUMP_APP_BARE_STEP,
  SNIPPET_MINIMAL_BUMP_APP_DOT_LOCAL_STEP,
  SNIPPET_MINIMAL_BUMP_APP_QUALIFIED_STEP,
} from '@shared/testing/tao-snippets'
import { describe, expect, test } from 'bun:test'
import { formatParseErrorHumanMessages } from './test-utils/diagnostics'

/** writeAndCompile materializes `code` to a tmp file, runs the compiler, and returns the concatenated text of every emitted module so substring assertions can target the resolved-prop / resolved-key emission. */
async function writeAndCompile(code: string): Promise<string> {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-bindings-'))
  const filePath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(filePath, code)
  const result = await compileTao({ file: filePath })
  if (!result.ok) {
    throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
  }
  return result.files.map(f => f.content).join('\n')
}

describe('codegen — call-site argument bindings:', () => {
  test('ViewRender emits one JSX prop per parameter, keyed by parameter name', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      view Btn Title text, OnPress action { }
      action H { }
      view V {
        Btn "x", H
      }
    `)
    expect(out).toMatch(/<Btn[\s\S]*?Title=\{/)
    expect(out).toMatch(/<Btn[\s\S]*?OnPress=\{/)
  })

  test('ActionRender invocation emits a props bag keyed by the resolved parameter names', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      action LogEvent Message text, Level number { }
      view V {
        action Outer {
          do LogEvent "submitted", 1
        }
      }
    `)
    expect(out).toMatch(/LogEvent\.invoke\(\{[\s\S]*Message:/)
    expect(out).toMatch(/LogEvent\.invoke\(\{[\s\S]*Level:/)
  })

  test('ActionRender invocation with no arguments emits an empty props bag', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      action Notify { }
      view V {
        action Outer {
          do Notify
        }
      }
    `)
    expect(out).toMatch(/Notify\.invoke\(\{\}\)/)
  })

  test('ActionRender with trailing block emits invoke then nested statements', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      action Inner { }
      view V {
        action Outer {
          do Inner {
            debugger
          }
        }
      }
    `)
    expect(out).toMatch(/Inner\.invoke\(\{\}\)[\s\S]*debugger/)
  })
})

describe('codegen — action local parameter types (Phase 3):', () => {
  test('all three forms emit equivalent Step prop key', async () => {
    const outBare = await writeAndCompile(SNIPPET_MINIMAL_BUMP_APP_BARE_STEP)
    const outQualified = await writeAndCompile(SNIPPET_MINIMAL_BUMP_APP_QUALIFIED_STEP)
    const outDotLocal = await writeAndCompile(SNIPPET_MINIMAL_BUMP_APP_DOT_LOCAL_STEP)
    expect(outBare).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
    expect(outQualified).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
    expect(outDotLocal).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
  })
})

const SNIPPET_INSTANT_DATA_APP = `
use Text from @tao/ui

data HarnessData {
  Items Item { T text }
}

app HarnessApp {
  provider InstantDB { appId "00000000-0000-0000-0000-000000000001" }
  ui HarnessRoot
}

view HarnessRoot {
  Text "ok"
}
`

const STD_LIB_ROOT = FS.resolvePath(FS.joinPath(__dirname, '../../tao-std-lib'))

describe('codegen — app provider selection and overrides:', () => {
  test('app provider override emits Memory provider registration, memory open params, and no instantdb import', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const filePath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(filePath, SNIPPET_INSTANT_DATA_APP)
    const result = await compileTao({ file: filePath, stdLibRoot: STD_LIB_ROOT, app: { provider: 'Memory' } })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('createTaoDataClient("Memory")')
    expect(out).not.toContain('createTaoDataClient("InstantDB")')
    expect(out).toContain('getTaoData("HarnessData").open({})')
    expect(out).not.toMatch(/from '\.\.\/.*instantdb\/instantdb'/)
  })

  test('default compile uses the app provider statement', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const filePath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(filePath, SNIPPET_INSTANT_DATA_APP)
    const result = await compileTao({ file: filePath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('createTaoDataClient("InstantDB")')
    expect(out).toContain('getTaoData("HarnessData").open({"appId":"00000000-0000-0000-0000-000000000001"})')
    expect(out).toMatch(/providers\/instantdb\/instantdb/)
  })

  test('data schema runtime shape includes non-primitive fields for provider insert validation', async () => {
    const out = await writeAndCompile(`
      data HarnessData {
        People Person { Name text }
        Events Event {
          Title text,
          Host Person,
          Attendees [Person],
        }
      }
      app HarnessApp { ui HarnessRoot }
      view HarnessRoot { }
    `)
    expect(out).toContain('events: { Title: "string", Host: "any", Attendees: "any" }')
  })

  test('app provider param override replaces provider init params without compiler validation', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const filePath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(filePath, SNIPPET_INSTANT_DATA_APP)
    const result = await compileTao({
      file: filePath,
      stdLibRoot: STD_LIB_ROOT,
      app: { provider: { appId: 'override-app' } },
    })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('createTaoDataClient("InstantDB")')
    expect(out).toContain('getTaoData("HarnessData").open({"appId":"override-app"})')
  })

  test('flat dotted app provider param override replaces provider init params', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const filePath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(filePath, SNIPPET_INSTANT_DATA_APP)
    const result = await compileTao({
      file: filePath,
      stdLibRoot: STD_LIB_ROOT,
      app: { 'provider.appId': 'flat-override-app' },
    })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('createTaoDataClient("InstantDB")')
    expect(out).toContain('getTaoData("HarnessData").open({"appId":"flat-override-app"})')
  })

  test('multiple data declarations keep distinct provider clients', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const filePath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(
      filePath,
      `
      data FirstData {
        FirstItems FirstItem { T text }
      }
      data SecondData {
        SecondItems SecondItem { T text }
      }
      query FirstData get FirstItem as FirstRows
      query SecondData get SecondItem as SecondRows
      app HarnessApp { ui HarnessRoot }
      view HarnessRoot { }
    `,
    )
    const result = await compileTao({ file: filePath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('setTaoData("FirstData", createTaoDataClient("Memory"))')
    expect(out).toContain('setTaoData("SecondData", createTaoDataClient("Memory"))')
    expect(out).toContain('getTaoData("FirstData").peekQuery("firstItems"')
    expect(out).toContain('getTaoData("SecondData").peekQuery("secondItems"')
    expect(out).toContain('getTaoData("FirstData").open({})')
    expect(out).toContain('getTaoData("SecondData").open({})')
  })

  test('bootstrap runs init hooks for imported Tao modules', async () => {
    const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-data-provider-'))
    const mainPath = FS.joinPath(tmpDir, 'app.tao')
    FS.writeFile(
      FS.joinPath(tmpDir, 'db.tao'),
      `
      share data SharedData {
        Items Item { T text }
      }
    `,
    )
    FS.writeFile(
      mainPath,
      `
      use SharedData from ./db
      query SharedData get Item as Rows
      app HarnessApp { ui HarnessRoot }
      view HarnessRoot { }
    `,
    )
    const result = await compileTao({ file: mainPath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const bootstrap = result.files.find(f => f.relativePath === result.entryRelativePath)?.content ?? ''
    expect(bootstrap).toContain('_taoRunAppInits0()')
    expect(bootstrap).toContain('_taoRunAppInits1()')
  })
})
