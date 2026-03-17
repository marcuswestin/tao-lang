import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchItemType_Exhaustive, switchProperty_Exhaustive } from '@shared/TypeSafety'
import { compileAliasDeclaration } from './alias-gen'
import { compileTopLevelInjection } from './injection-gen'
import { compileViewDeclaration } from './view-gen'

export function compileTopLevelStatement(statement: AST.TopLevelStatement): Compiled {
  return switchItemType_Exhaustive(statement, {
    'UseStatement': compileUseStatement,
    'Injection': compileTopLevelInjection,
    'TopLevelDeclaration': compileTopLevelDeclaration,
  })
}

function compileTopLevelDeclaration(node: AST.TopLevelDeclaration): Compiled {
  return switchItemType_Exhaustive(node.declaration, {
    'AppDeclaration': compileAppDeclaration,
    'ViewDeclaration': compileViewDeclaration,
    'AliasDeclaration': compileAliasDeclaration,
  })
}

function compileUseStatement(useStatement: AST.UseStatement): Compiled {
  const fromClause = useStatement.modulePath ? ` from ${useStatement.modulePath}` : ''
  return compileNode(useStatement)`
    // Tao: use ${useStatement.importedNames.join(', ')}${fromClause}
  `
}

function compileAppDeclaration(declaration: AST.AppDeclaration): Compiled {
  return compileNodeListProperty(declaration, 'appStatements', compileAppStatement)
}

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
