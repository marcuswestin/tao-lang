import { validationMessages } from '@compiler/validation/tao-lang-validator'
import {
  describe,
  expect,
  parseASTWithErrors,
  parseMultipleFiles,
  parseTaoFully,
  test,
} from './test-utils/test-harness'

describe('parse:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('needle test', async () => {
    const needle = Math.random().toString(36).substring(2, 15)
    const code = `
        app KitchenSink { ui RootView }
        view RootView { Text value "${needle}" {} }
        view Text value string {
            inject \`\`\`ts return <RN.Text>{_ViewProps.value}</RN.Text> \`\`\`
        }
    `
    const result = await parseTaoFully(code)
    expect(result).toBeDefined()
    result.statements.first.as_AppDeclaration.expect('name').toBe('KitchenSink')
  })

  test('action nested in a view validates', async () => {
    await parseTaoFully(`
      view V {
        action A {
          inject \`\`\`ts void 0 \`\`\`
        }
      }
    `)
  })

  test('duplicate parameter and alias name in same view fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V x string {
        alias x = 1
        Text value "hi" { }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes("Duplicate identifier 'x'"))).toBe(true)
  })
})

describe('statement placement validation:', () => {
  test('state update in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V {
        state s = 1
        set s = 2
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.viewBody))).toBe(true)
  })

  test('use statement in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V {
        use X from a/b
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.viewBody))).toBe(true)
  })

  test('view render at file level fails validation', async () => {
    const report = await parseASTWithErrors(`
      view Text value string { }
      Text value "hi"
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.topLevel))).toBe(true)
  })

  test('state update at file level fails validation', async () => {
    const report = await parseASTWithErrors(`
      state x = 1
      set x = 2
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.topLevel))).toBe(true)
  })

  test('module declaration in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view Outer {
        hide view Inner { }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.viewBody))).toBe(true)
  })

  test('view render in action body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view Text value string { }
      view V {
        action A {
          Text value "x"
        }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.actionBody))).toBe(true)
  })

  test('view render in inline action expression body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view Text value string { }
      view Btn title string, Action any { }
      view V {
        Btn title "x", Action action {
          Text value "bad"
        }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.actionBody))).toBe(true)
  })

  test('state update in inline action expression is allowed (same as named action body)', async () => {
    await parseTaoFully(`
      view B title string, Action any { }
      view V {
        state s = 0
        B title "b", Action action { set s = 1 }
      }
    `)
  })

  test('state update in action body is allowed (not in view body)', async () => {
    await parseTaoFully(`
      view V {
        state s = 1
        action A {
          set s = 2
        }
      }
    `)
  })

  test('app declaration in view body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V {
        view X { }
        app A { ui X }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes(validationMessages.viewBody))).toBe(true)
  })
})

describe('state update RHS edge cases (parse + validate):', () => {
  test('set file-level state from file-level alias (=)', async () => {
    await parseTaoFully(`
      state a = 10
      alias b = 20
      view V {
        action CopyAliasToState {
          set a = b
        }
      }
    `)
  })

  test('set file-level state from another file-level state with expression', async () => {
    await parseTaoFully(`
      state a = 1
      state b = 2
      view V {
        action Combine {
          set b = a + 3
        }
      }
    `)
  })

  test('set view state from file-level state and alias in expression', async () => {
    await parseTaoFully(`
      state fileN = 100
      alias offset = 7
      view V {
        state localN = 0
        action InitFromFileAndAlias {
          set localN = fileN + offset
        }
      }
    `)
  })

  test('set file-level state from view state (=)', async () => {
    await parseTaoFully(`
      state fileS = 0
      view V {
        state localS = 5
        action PushUp {
          set fileS = localS
        }
      }
    `)
  })

  test('set with += using another state on RHS', async () => {
    await parseTaoFully(`
      state base = 3
      state acc = 10
      view V {
        action AddBase {
          set acc += base
        }
      }
    `)
  })

  test('unary minus in RHS expression', async () => {
    await parseTaoFully(`
      state a = 5
      state b = 0
      view V {
        action T {
          set b = -a + 10
        }
      }
    `)
  })
})

describe('parameter declaration validation:', () => {
  test('duplicate parameter names in a view parameter list fail validation', async () => {
    const report = await parseASTWithErrors(`
      view V x string, x string {
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes("Duplicate identifier 'x'"))).toBe(true)
  })

  test('duplicate parameter names in an action parameter list fail validation', async () => {
    const report = await parseASTWithErrors(`
      view V {
        action A x string, x string {
          inject \`\`\`ts void 0 \`\`\`
        }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes("Duplicate identifier 'x'"))).toBe(true)
  })

  test('parameter name same as nested view declaration in body fails validation', async () => {
    const report = await parseASTWithErrors(`
      view V x string {
        view x {
        }
      }
    `)
    expect(report.getHumanErrorMessages().some(m => m.includes("Duplicate identifier 'x'"))).toBe(true)
  })

  test('distinct parameter names in one view validate', async () => {
    await parseTaoFully(`
      view V a string, b string {
      }
    `)
  })
})

describe('compile errors:', () => {
  test('missing view reference in app ui produces linking error with expected message', async () => {
    const multi = await parseMultipleFiles([
      {
        path: '/project/app.tao',
        code: `app CompileErrorApp {
    ui MissingView
}
`,
      },
    ])

    const errorReport = multi.getErrors()
    const errorMessages = errorReport.getHumanErrorMessages()

    expect(errorMessages.length).toBeGreaterThan(0)
    expect(errorMessages.some(msg => msg.includes('MissingView') && msg.includes('Could not resolve reference')))
      .toBe(true)
  })
})
