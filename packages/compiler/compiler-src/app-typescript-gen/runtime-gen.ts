import { assertNever, Compiled, compileNode, compileNodeProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import { switchType_Exhaustive } from '@shared/TypeSafety'
import * as langium from 'langium'
import * as path from 'node:path'
import { compileExpression, compileNamedReference, compileNumberLiteral, compileStringLiteral } from './expression-gen'
import { compileActionDeclaration, compileAppDeclaration } from './file-toplevel-gen'
import { compileRefName, compileTODO } from './shared-gen'
import { compileViewDeclaration } from './view-gen'

export type NamedReference = langium.Reference<AST.Referenceable>

function compileModulePath(useStatement: AST.UseStatement): string {
  return useStatement.modulePath ? `${useStatement.modulePath}` : 'undefined'
}

type Module = string & { __brand: 'Module' }
const asModule = (value: string): Module => value as Module

/** ModuleImports tracks which modules were imported during codegen (see RuntimeGenCtx.moduleImports). */
class ModuleImports {
  private importedModules = new Set<Module>()
  add(module: Module) {
    this.importedModules.add(this.normalizeModulePath(module))
  }
  private normalizeModulePath(module: Module): Module {
    return asModule(path.normalize(module))
  }
}

export class RuntimeGenCtx {
  TODO(node: langium.AstNode): Compiled {
    return compileTODO(node)
  }

  // TODO: Track imported modules during compilation, rather than seperately.
  moduleImports = new ModuleImports()

  moduleDeclaration(moduleDecl: AST.ModuleDeclaration): Compiled {
    const visibility = compileNodeProperty(moduleDecl, 'visibility', (val) => val ? 'export ' : '')
    const declaration = this.Declaration(moduleDecl.declaration)
    return compileNode(moduleDecl)`
      ${visibility}${declaration}
    `
  }
  useStatement(useStatement: AST.UseStatement): Compiled {
    const importedNames = useStatement.importedNames.join(', ')
    const modulePath = compileModulePath(useStatement)
    // return this.TODO(useStatement)
    return compileNode(useStatement)`
      // import { ${importedNames} } from '${modulePath}'
    `
  }
  updateState(update: AST.StateUpdate): Compiled {
    const stateRef = compileRefName(update.stateRef)
    const op = compileNodeProperty(update, 'op')
    const value = compileExpression(update.value)
    return compileNode(update)`
      // TaoRuntime.updateState(${stateRef}, ${op}, ${value})
    `
  }
  Declaration(declaration: AST.Declaration): Compiled {
    if (AST.isAssignmentDeclaration(declaration)) {
      return this.AssignmentDeclaration(declaration)
    } else if (AST.isBlockDeclaration(declaration)) {
      // TODO: Move functions here
      return AST.isViewDeclaration(declaration)
        ? compileViewDeclaration(declaration)
        : compileActionDeclaration(declaration)
    } else if (AST.isAppDeclaration(declaration)) {
      // TODO: Move function here
      return compileAppDeclaration(declaration)
    }
    assertNever(declaration)
  }
  AssignmentDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    const name = compileRefName(declaration)
    const value = compileExpression(declaration.value)
    // const ${name} = new TaoRuntime.${declaration.$type}_Constructor(${value});
    return compileNode(declaration)`
      const ${name} = ${value};
    `
  }
  expression(expression: AST.Expression): Compiled {
    return switchType_Exhaustive(expression, {
      StringLiteral: compileStringLiteral,
      NumberLiteral: compileNumberLiteral,
      NamedReference: compileNamedReference,
    })
  }

  // OLD: Save these for now
  //////////////////////////
  //
  // declareName(ref: AST.Referenceable, value: Compiled): Compiled {
  //   return compileNode(ref)`
  //     const ${compileRefName(ref)} = ${value}
  //   `
  // },
  // declare(ref: AST.Referenceable, runtimeCtor: string, value: AST.Expression): Compiled {
  //   return compileNode(ref)`
  //     const ${compileRefName(ref)} = ${runtimeCtor}(${RuntimeGen.expression(value)})
  //   `
  // },
  // actionLiteral(action: ActionDeclaration): Compiled {
  //   return compileNode(action)`
  //     function ${compileRefName(action)}(${compileParameterList(action.parameterList)}) {
  //       ${compileNodeListProperty(action, 'actionStatements', RuntimeGen.blockStatement)}
  //     }
  //   `
  // },
  // blockStatement(statement: AST.ActionStatement): Compiled {
  //   return compileTODO(statement)
  // },
  // readExpression(expression: AST.Expression) {
  //   return `TaoRuntime.readExpsression(${compileExpression(expression)})`
  // },
  // readState(ref: AST.Referenceable) {
  //   return `TaoRuntime.readState(${compileName(ref)})`
  // },
  // writeState(name: string, value: AST.Expression) {
  //   return `TaoRuntime.writeState(${name}, ${compileExpression(value)})`
  // },
}

// TODO: Move all compilation in here, and stop using a singleton/global context.
export const RuntimeGen = new RuntimeGenCtx()
