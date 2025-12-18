// import { wrap } from './test-utils/AST-Wrapper'
import { describe, expect, parseTaoFully, test } from './test-utils/test-harness'

describe('parse:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('asd', async () => {
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
    result.topLevelStatements.first.as_AppDeclaration.expect('name').toBe('KitchenSink')
  })

  // test('no newlines in code', async () => {
  //   const document = await parseTaoString(`app MyApp { ui MyView } view MyView { }`)
  //   expect(document).toBeDefined()
  // })

  // test('basic app', async () => {
  //   const document = await parseTaoString(`
  //       app MyApp {
  //           ui MyView
  //       }
  //       view MyView {
  //       }
  //       view Text {}
  //   `)

  //   const appFile = wrap(document)
  //   const appDeclaration = appFile.topLevelStatements[0]!.as_AppDeclaration
  //   appDeclaration.expect('type').toBe('app')
  //   appDeclaration.expect('name').toBe('MyApp')
  //   const uiView = appDeclaration.appStatements[0]!.ui.as_ViewDeclaration
  //   uiView.expect('name').toBe('MyView')
  //   const viewDeclaration = appFile.topLevelStatements[1]!.as_ViewDeclaration
  //   expect(viewDeclaration.unwrap()).toEqual(uiView.unwrap())
  // })

  // test('reference validation errors', async () => {
  //   const errorReport = await ensureHasErrors(`
  //       app MyApp {
  //           ui MyApp
  //       }
  //       view MyView {
  //           Text value "Hello World"
  //       }
  //   `)!
  //   expect(errorReport!.errorString).toContain('Could not resolve reference')
  //   expect(errorReport!.errorString).toContain('App ui must be a view declaration')
  // })
})
