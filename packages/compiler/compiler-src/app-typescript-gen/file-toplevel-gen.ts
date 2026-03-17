import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchProperty_Exhaustive, switchType_Exhaustive } from '@shared/TypeSafety'
import { compileAliasDeclaration } from './alias-gen'
import { compileTopLevelInjection } from './injection-gen'
import { compileViewDeclaration } from './view-gen'

/** compileTopLevelStatement dispatches to use, injection, or top-level declaration codegen. */
export function compileTopLevelStatement(statement: AST.TopLevelStatement): Compiled {
  return switchType_Exhaustive(statement, {
    'UseStatement': compileUseStatement,
    'Injection': compileTopLevelInjection,
    'TopLevelDeclaration': compileTopLevelDeclaration,
  })
}

/** compileTopLevelDeclaration emits app, view, or alias at file top level. */
function compileTopLevelDeclaration(node: AST.TopLevelDeclaration): Compiled {
  return switchType_Exhaustive(node.declaration, {
    'AppDeclaration': compileAppDeclaration,
    'ViewDeclaration': compileViewDeclaration,
    'AliasDeclaration': compileAliasDeclaration,
  })
}

/** compileUseStatement emits a comment placeholder for a Tao use line. */
function compileUseStatement(useStatement: AST.UseStatement): Compiled {
  const fromClause = useStatement.modulePath ? ` from ${useStatement.modulePath}` : ''
  return compileNode(useStatement)`
    // Tao: use ${useStatement.importedNames.join(', ')}${fromClause}
  `
}

/** compileAppDeclaration emits all app statements for one app declaration. */
function compileAppDeclaration(declaration: AST.AppDeclaration): Compiled {
  return compileNodeListProperty(declaration, 'appStatements', compileAppStatement)
}

/** compileAppStatement emits codegen for app statements (currently only ui → AppUIView). */
function compileAppStatement(statement: AST.AppStatement): Compiled {
  return switchProperty_Exhaustive(statement, 'type', {
    ui: () =>
      compileNode(statement)`
      function AppUIView() {
        return <${statement.ui.ref!.name} />
      }
    `,
  })
}
