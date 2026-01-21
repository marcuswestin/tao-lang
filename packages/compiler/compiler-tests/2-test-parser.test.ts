import { describe, expect, parseAST, parseASTWithErrors, test } from './test-utils/test-harness'

describe('parse:', () => {
  test('stub test', () => expect(true).toBe(true))

  test('no newlines in code', async () => {
    const document = await parseAST(`app MyApp { ui MyView } view MyView { }`)
    expect(document).toBeDefined()
  })

  test('basic app', async () => {
    const appFile = await parseAST(`
        app MyApp {
            ui MyView
        }
        view MyView {}
        view Text {}
    `)

    const appDeclaration = appFile.topLevelStatements.first.as_AppDeclaration
    appDeclaration.expect('type').toBe('app')
    appDeclaration.expect('name').toBe('MyApp')
    const uiView = appDeclaration.appStatements.first.ui.as_ViewDeclaration
    uiView.expect('name').toBe('MyView')
    const viewDeclaration = appFile.topLevelStatements.second.as_ViewDeclaration
    expect(viewDeclaration.unwrap()).toEqual(uiView.unwrap())
  })

  test('reference validation errors', async () => {
    const errorReport = await parseASTWithErrors(`
        app MyApp {
            ui MyApp
        }
        view MyView {
            Text value "Hello World"
        }
    `)!
    expect(errorReport!.humanErrorMessage).toContain('Could not resolve reference')
    expect(errorReport!.humanErrorMessage).toContain('App ui must be a view declaration')
  })
})

describe('module declaration visibility', () => {
  test('parses file view declaration', async () => {
    const doc = await parseAST(`file view PrivateView { }`)
    const viewDecl = doc.topLevelStatements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('PrivateView')
    viewDecl.expect('visibility').toBe('file')
  })

  test('parses share view declaration', async () => {
    const doc = await parseAST(`share view PublicView { }`)
    const viewDecl = doc.topLevelStatements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('PublicView')
    viewDecl.expect('visibility').toBe('share')
  })

  test('parses file app declaration', async () => {
    const doc = await parseAST(`
      file app PrivateApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.topLevelStatements.first.as_AppDeclaration
    appDecl.expect('name').toBe('PrivateApp')
    appDecl.expect('visibility').toBe('file')
  })

  test('parses share app declaration', async () => {
    const doc = await parseAST(`
      share app PublicApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.topLevelStatements.first.as_AppDeclaration
    appDecl.expect('name').toBe('PublicApp')
    appDecl.expect('visibility').toBe('share')
  })

  test('parses declaration without visibility modifier (default)', async () => {
    const doc = await parseAST(`view DefaultView { }`)
    const viewDecl = doc.topLevelStatements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('DefaultView')
    viewDecl.expect('visibility').toBeUndefined()
  })
})
