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
            inject \`\`\`ts return <RN.Text>{props.value}</RN.Text> \`\`\`
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
        file view Inner { }
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
        code: `file app CompileErrorApp {
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
