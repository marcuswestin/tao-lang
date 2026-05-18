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

/** slicePeekQueryPlanObject returns the `{ ... }` object literal passed to `peekQuery` for a scoped assignment prefix. */
function slicePeekQueryPlanObject(source: string, assignmentPrefix: string): string {
  const start = source.indexOf(assignmentPrefix)
  if (start === -1) {
    throw new Error(`missing peekQuery assignment: ${assignmentPrefix}`)
  }
  const braceStart = source.indexOf('{', start)
  if (braceStart === -1) {
    throw new Error('missing peekQuery opening brace')
  }
  let depth = 0
  for (let i = braceStart; i < source.length; i++) {
    const c = source[i]!
    if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        return source.slice(braceStart, i + 1)
      }
    }
  }
  throw new Error('unbalanced braces in peekQuery plan object')
}

describe('codegen — call-site argument bindings:', () => {
  test('ViewRender emits one JSX prop per parameter, keyed by parameter name', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      ui Btn Title text, OnPress action {
        render inject \`\`\`ts return null \`\`\`
      }
      action H { }
      ui V {
        render Btn "x", H
      }
    `)
    expect(out).toMatch(/<Btn[\s\S]*?Title=\{/)
    expect(out).toMatch(/<Btn[\s\S]*?OnPress=\{/)
  })

  test('ActionRender invocation emits a props bag keyed by the resolved parameter names', async () => {
    const out = await writeAndCompile(`
      app A { ui V }
      action LogEvent Message text, Level number { }
      ui V {
        render inject \`\`\`ts return null \`\`\`
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
      ui V {
        render inject \`\`\`ts return null \`\`\`
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
      ui V {
        render inject \`\`\`ts return null \`\`\`
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

ui HarnessRoot {
  render Text "ok"
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
    expect(out).toMatch(/providers\/all/)
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
      ui HarnessRoot {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expect(out).toContain(
      '"events":{"Title":{"type":"string"},"Host":{"type":"any"},"Attendees":{"type":"any"}}',
    )
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
      query FirstData.FirstItems as FirstRows { T }
      query SecondData.SecondItems as SecondRows { T }
      app HarnessApp { ui HarnessRoot }
      ui HarnessRoot {
        render inject \`\`\`ts return null \`\`\`
      }
    `,
    )
    const result = await compileTao({ file: filePath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    expect(out).toContain('setTaoData("FirstData", createTaoDataClient("Memory"))')
    expect(out).toContain('setTaoData("SecondData", createTaoDataClient("Memory"))')
    expect(out).toContain('getTaoData("FirstData").peekQuery({')
    expect(out).toContain('collection: "firstItems"')
    expect(out).toContain('getTaoData("SecondData").peekQuery({')
    expect(out).toContain('collection: "secondItems"')
    expect(out).toContain('getTaoData("FirstData").open({})')
    expect(out).toContain('getTaoData("SecondData").open({})')
  })

  test('file-level queries are initialized after data providers open', async () => {
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
      query SharedData.Items as Rows { T }
      app HarnessApp { ui HarnessRoot }
      ui HarnessRoot {
        render inject \`\`\`ts return null \`\`\`
      }
    `,
    )
    const result = await compileTao({ file: mainPath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const out = result.files.map(f => f.content).join('\n')
    const bootstrap = result.files.find(f => f.relativePath === result.entryRelativePath)?.content ?? ''
    expect(out).toMatch(
      /export function _taoRunAppInits\(\) \{[\s\S]*_Scope\.Rows = getTaoData\("SharedData"\)\.peekQuery/,
    )
    expect(bootstrap).toMatch(
      /_taoOpenDataProviders0\(\)[\s\S]*_taoOpenDataProviders1\(\)[\s\S]*_taoRunAppInits0\(\)[\s\S]*_taoRunAppInits1\(\)/,
    )
  })

  test('selection-block query emits structured query plan with dynamic values', async () => {
    const out = await writeAndCompile(`
      data D {
        People Person {
          Age number indexed,
          Email text unique,
        }
      }
      state MinAge = 18
      query D.People as Youth {
        Age >= MinAge,
        Email,
      }
      query D.Person {
        Email = "ro@example.test",
      }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expect(out).toContain('cardinality: "many"')
    expect(out).toContain('collection: "people"')
    expect(out).toContain('"Age":{"type":"number","indexed":true}')
    expect(out).toContain('"Email":{"type":"string","unique":true,"indexed":true}')
    expect(out).toContain('path: ["Age"]')
    expect(out).not.toContain('path: ["Person", "Age"]')
    expect(out).not.toContain('path: ["People", "Age"]')
    expect(out).toContain('op: ">="')
    expect(out).toContain('value: _Scope.MinAge')
    expect(out).toContain('select: [')
    expect(out).toContain('_Scope.Person = getTaoData("D").peekQuery({')
    expect(out).toContain('cardinality: "one"')
  })

  test('relationship identity predicates emit hidden-id comparison metadata', async () => {
    const out = await writeAndCompile(`
      data D {
        People Person {
          Email text unique,
          Name text,
        }
        Events Event {
          Title text,
          Host Person,
          Attendees [Person],
        }
      }
      query D.Person as CurrentUser {
        Email = "ro@example.test",
      }
      query D.Events as HostedEvents {
        Title,
        Host = CurrentUser,
        Attendees != CurrentUser,
      }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const queryPlan = slicePeekQueryPlanObject(out, '_Scope.HostedEvents = getTaoData("D").peekQuery(')
    const selectBlock = queryPlan.slice(queryPlan.indexOf('select: ['), queryPlan.indexOf('where: ['))

    expect(queryPlan).toContain('path: ["Host"]')
    expect(queryPlan).toContain('path: ["Attendees"]')
    expect(queryPlan).toContain('compareField: "id"')
    expect(queryPlan).toContain('clientOnly: true')
    expect(queryPlan).toContain('path: ["Title"]')
    expect(selectBlock).not.toContain('path: ["Host"]')
    expect(selectBlock).not.toContain('path: ["Attendees"]')
  })

  test('bare relationship selection emits scalar-only nested projection', async () => {
    const out = await writeAndCompile(`
      data D {
        Tags Tag {
          Name text,
          Tasks [Task],
        }
        Tasks Task {
          Title text,
          Tags [Tag],
        }
        Todos Todo {
          Description text,
          Done boolean,
          Tags [Tag],
          Task,
        }
        Users User {
          Name text,
          Todos [Todo],
        }
      }
      query D.Users {
        Name,
        Todos,
      }
      query D.Users as UsersWithTodoLinks {
        Todos {
          Task,
          Description,
          Tags,
        },
      }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    expect(out).toMatch(/path: \["Todos"\][\s\S]*select: \[[\s\S]*path: \["Description"\][\s\S]*path: \["Done"\]/)
    expect(out).toMatch(/path: \["Tags"\][\s\S]*select: \[[\s\S]*path: \["Name"\]/)
    expect(out).not.toMatch(/path: \["Tags"\][\s\S]*path: \["Tasks"\]/)
  })

  test('empty entity selection emits root scalar fields only', async () => {
    const out = await writeAndCompile(`
      data D {
        Tasks Task { Title text }
        Users User {
          Name text,
          Todos [Task],
        }
      }
      query D.Users as DefaultUsers
      query D.Users as EmptyBlockUsers { }
      app A { ui V }
      ui V {
        render inject \`\`\`ts return null \`\`\`
      }
    `)
    const queryPlan = slicePeekQueryPlanObject(out, '_Scope.DefaultUsers = getTaoData("D").peekQuery(')
    expect(queryPlan).toContain('path: ["Name"]')
    expect(queryPlan).not.toContain('path: ["Todos"]')

    const emptyQueryPlan = slicePeekQueryPlanObject(out, '_Scope.EmptyBlockUsers = getTaoData("D").peekQuery(')
    expect(emptyQueryPlan).toContain('path: ["Name"]')
    expect(emptyQueryPlan).not.toContain('path: ["Todos"]')
  })

  test('compile result exposes provider config and serialized data schemas', async () => {
    const appPath = FS.resolvePath(
      __dirname,
      '../../../Apps/Test Apps/Data Schema/Data Schema.tao',
    )
    const result = await compileTao({ file: appPath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    expect(result.appDataProvider.name).toBe('InstantDB')
    const schema = result.dataSchemas.find(s => s.name === 'MeetupData')
    expect(schema?.shape.entities['events']?.['Ordering']).toEqual({ type: 'number', indexed: true })
    expect(schema?.shape.entities['people']?.['Email']).toEqual({
      type: 'string',
      optional: true,
      unique: true,
      indexed: true,
    })
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
      query SharedData.Items as Rows { T }
      app HarnessApp { ui HarnessRoot }
      ui HarnessRoot {
        render inject \`\`\`ts return null \`\`\`
      }
    `,
    )
    const result = await compileTao({ file: mainPath, stdLibRoot: STD_LIB_ROOT })
    if (!result.ok) {
      throw new Error(`Compile failed:\n${formatParseErrorHumanMessages(result.errorReport)}`)
    }
    const bootstrap = result.files.find(f => f.relativePath === result.entryRelativePath)?.content ?? ''
    expect(bootstrap).toContain('_taoOpenDataProviders0()')
    expect(bootstrap).toContain('_taoOpenDataProviders1()')
    expect(bootstrap).toContain('_taoRunAppInits0()')
    expect(bootstrap).toContain('_taoRunAppInits1()')
  })
})
