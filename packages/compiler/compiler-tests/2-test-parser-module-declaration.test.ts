import { describe, parseAST, test } from './test-utils/test-harness'

describe('module declaration visibility', () => {
  test('parses hide ui declaration', async () => {
    const doc = await parseAST(`hide ui PrivateView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('hide')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PrivateView')
  })

  test('parses share ui declaration', async () => {
    const doc = await parseAST(`share ui PublicView { }`)
    const viewDecl = doc.statements.first.as_ModuleDeclaration
    viewDecl.expect('visibility').toBe('share')
    viewDecl.declaration.as_ViewDeclaration.expect('name').toBe('PublicView')
  })

  test('parses bare app declaration (no visibility modifier)', async () => {
    const doc = await parseAST(`
      app PrivateApp { ui MyView }
      ui MyView { }
    `)
    doc.statements.first.as_AppDeclaration.expect('name').toBe('PrivateApp')
    const myView = doc.statements.second.as_ViewDeclaration
    myView.expect('name').toBe('MyView')
  })

  test('parses share app declaration', async () => {
    const doc = await parseAST(`
      share app PublicApp { ui MyView }
      ui MyView { }
    `)
    const appDecl = doc.statements.first.as_ModuleDeclaration
    appDecl.expect('visibility').toBe('share')
    appDecl.declaration.as_AppDeclaration.expect('name').toBe('PublicApp')
  })

  test('parses declaration without visibility modifier (default)', async () => {
    const doc = await parseAST(`ui DefaultView { }`)
    const viewDecl = doc.statements.first.as_ViewDeclaration
    viewDecl.expect('name').toBe('DefaultView')
  })
})
