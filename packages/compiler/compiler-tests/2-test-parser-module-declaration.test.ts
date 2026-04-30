import { describe, parseAST, test } from './test-utils/test-harness'

describe('module declaration visibility', () => {
  test('parses hide view declaration', async () => {
    const doc = await parseAST(`hide view PrivateView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('hide')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PrivateView')
  })

  test('parses share view declaration', async () => {
    const doc = await parseAST(`share view PublicView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('share')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PublicView')
  })

  test('parses bare app declaration (no visibility modifier)', async () => {
    const doc = await parseAST(`
      app PrivateApp { ui MyView }
      view MyView { }
    `)
    doc.statements.first.as_AppDeclaration.expect('name').toBe('PrivateApp')
    const myView = doc.statements.second.as_ViewDeclaration
    myView.expect('name').toBe('MyView')
  })

  test('parses share app declaration', async () => {
    const doc = await parseAST(`
      share app PublicApp { ui MyView }
      view MyView { }
    `)
    const appDecl = doc.statements.first.as_ModuleDeclaration
    appDecl.expect('visibility').toBe('share')
    appDecl.declaration.as_AppDeclaration.expect('name').toBe('PublicApp')
  })

  test('parses declaration without visibility modifier (default)', async () => {
    const doc = await parseAST(`view DefaultView { }`)
    const viewDecl = doc.statements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('DefaultView')
  })
})
