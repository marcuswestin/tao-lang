// Codegen-string assertions for the call-site argument binding pipeline. The compiler is exercised
// end-to-end via `compileTao`, then we slice the bootstrap-output module text and look for the resolved
// JSX prop / runtime-call key. These tests pin the **emission** (not just typing) so by-type matching
// stays runtime-correct.

import { compileTao } from '@compiler/compiler-main'
import { FS } from '@shared'
import { describe, expect, test } from 'bun:test'

/** writeAndCompile materializes `code` to a tmp file, runs the compiler, and returns the concatenated text of every emitted module so substring assertions can target the resolved-prop / resolved-key emission. */
async function writeAndCompile(code: string): Promise<string> {
  const tmpDir = FS.mkTmpDir(FS.joinPath(FS.tmpdir(), 'tao-codegen-bindings-'))
  const filePath = FS.joinPath(tmpDir, 'app.tao')
  FS.writeFile(filePath, code)
  const result = await compileTao({ file: filePath })
  if (!result.ok) {
    throw new Error(`Compile failed:\n${result.errorReport.getHumanErrorMessage()}`)
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
    const outBare = await writeAndCompile(`
      app A { ui V }
      state Counter = 0
      action Bump Step is number { set Counter += Step }
      view V { action Use { do Bump Step 1 } }
    `)
    const outQualified = await writeAndCompile(`
      app A { ui V }
      state Counter = 0
      action Bump Step is number { set Counter += Step }
      view V { action Use { do Bump Bump.Step 2 } }
    `)
    const outDotLocal = await writeAndCompile(`
      app A { ui V }
      state Counter = 0
      action Bump Step is number { set Counter += Step }
      view V { action Use { do Bump .Step 3 } }
    `)
    expect(outBare).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
    expect(outQualified).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
    expect(outDotLocal).toMatch(/Bump\.invoke\(\{[\s\S]*Step:/)
  })
})
