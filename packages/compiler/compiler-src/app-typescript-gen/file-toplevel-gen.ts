import { Compiled, compileNode, compileNodeListProperty, compileNoop } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchProperty_Exhaustive, switchType_Exhaustive } from '@shared/TypeSafety'
import { compileActionDeclaration } from './action-gen'
import { compileAliasDeclaration } from './alias-gen'
import { compileInjection } from './injection-gen'
import { compileViewDeclaration } from './view-gen'

/** compileTopLevelStatement compiles all top level statements. */
export function compileTopLevelStatement(statement: AST.TopLevelStatement): Compiled {
  return switchType_Exhaustive(statement, {
    'UseStatement': compileUseStatement,
    'Injection': compileInjection,
    'TopLevelDeclaration': compileTopLevelDeclaration,
  })
}

/** compileTopLevelDeclaration emits top level declaration statements. */
function compileTopLevelDeclaration(node: AST.TopLevelDeclaration): Compiled {
  return switchType_Exhaustive(node.declaration, {
    'AppDeclaration': compileAppDeclaration,
    'ViewDeclaration': compileViewDeclaration,
    'AliasDeclaration': compileAliasDeclaration,
    'ActionDeclaration': compileActionDeclaration,
  })
}

/** compileUseStatement is a no-op in the module body; ES imports are emitted in `import-header-gen`. */
function compileUseStatement(_useStatement: AST.UseStatement): Compiled {
  return compileNoop()
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
      export function AppUIView() {
        return <${statement.ui.ref!.name} />
      }
    `,
  })
}
