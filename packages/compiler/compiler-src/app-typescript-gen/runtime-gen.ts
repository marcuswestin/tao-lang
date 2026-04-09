import {
  Compiled,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  compileNodeListPropertyOptional,
  compileNodeProperty,
  compileNodePropertyRef,
  compileNoop,
} from '@compiler/compiler-utils'
import { langium } from '@compiler/util/libs'
import { AST } from '@parser'
import { switchProperty_Exhaustive, switchType_Exhaustive } from '@shared/TypeSafety'
import { ModuleImports } from './runtime-module-imports'
import { compileParameterList, compileRefName, compileTODO } from './shared-gen'

export function compileTaoFile(taoFile: AST.TaoFile): Compiled {
  return new RuntimeGen().TaoFile(taoFile)
}

class RuntimeGen {
  // TODO: Track imported modules during compilation, rather than separately.
  moduleImports = new ModuleImports()

  TODO(node: langium.AstNode): Compiled {
    return compileTODO(node)
  }

  TaoFile(taoFile: AST.TaoFile): Compiled {
    return compileNodeListProperty(taoFile, 'statements', stmt => this.Statement(stmt))
  }

  Statement(statement: AST.Statement): Compiled {
    return switchType_Exhaustive(statement, {
      Injection: (n) => this.Injection(n),
      StateUpdate: (n) => this.StateUpdate(n),
      ModuleDeclaration: (n) => this.ModuleDeclaration(n),
      UseStatement: (n) => this.UseStatement(n),
      AppDeclaration: (n) => this.Declaration(n),
      AssignmentDeclaration: (n) => this.Declaration(n),
      ViewDeclaration: (n) => this.Declaration(n),
      ActionDeclaration: (n) => this.Declaration(n),
      ViewRender: (n) => this.ViewRender(n),
    })
  }

  Declaration(declaration: AST.Declaration): Compiled {
    return switchType_Exhaustive(declaration, {
      AssignmentDeclaration: (n) => this.AssignmentDeclaration(n),
      AppDeclaration: (n) => this.AppDeclaration(n),
      ActionDeclaration: (n) => this.ActionDeclaration(n),
      ViewDeclaration: (n) => this.ViewDeclaration(n),
    })
  }

  Expression(expression: AST.Expression): Compiled {
    return switchType_Exhaustive(expression, {
      StringLiteral: (node) => {
        return compileNode(node)`
          TaoRuntime.StringLiteral(${JSON.stringify(node.string)})
        `
      },
      NumberLiteral: (node) => {
        return compileNode(node)`
          TaoRuntime.NumberLiteral(${JSON.stringify(node.number)})
        `
      },
      NamedReference: (node) => {
        // Prefer the linked declaration’s name when the reference is resolved; fall back to the
        // reference token text when `ref` is missing so codegen does not throw on unresolved refs
        // (partial workspace, broken files, or pre-scope-computation runs).
        const id = node.referenceName.ref?.name ?? node.referenceName.$refText
        return compileNode(node)`
          TaoRuntime.useNamedReference(${id})
        `
      },
    })
  }

  // Shared statements
  ////////////////////

  AssignmentDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    return switchProperty_Exhaustive(declaration, 'type', {
      alias: () => this.AliasDeclaration(declaration),
      state: () => this.StateDeclaration(declaration),
    })
  }

  AliasDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    // TODO: const ${name} = TaoRuntime.${declaration.$type}_Constructor(${value});
    const name = compileRefName(declaration)
    const value = this.Expression(declaration.value)
    return compileNode(declaration)`
      const ${name} = TaoRuntime.Alias(${value});
    `
  }

  Block(block?: AST.Block): Compiled {
    if (!block) {
      return compileNoop()
    }
    return compileNodeListProperty(block, 'statements', stmt => this.Statement(stmt))
  }

  ArgumentList(argumentList?: AST.ArgumentList): Compiled | undefined {
    return compileNodeListPropertyOptional(argumentList, 'arguments', argument => {
      return compileNode(argument)`
      ${argument.name} = {${this.Expression(argument.value)}}
    `
    })
  }

  // Top-level statements
  ///////////////////////

  UseStatement(useStatement: AST.UseStatement): Compiled {
    const importedNames = useStatement.importedNames.join(', ')
    const modulePath = useStatement.modulePath
    return compileNode(useStatement)`
      // import { ${importedNames} } from '${modulePath}'
    `
  }

  AppDeclaration(declaration: AST.AppDeclaration): Compiled {
    return compileNodeListProperty(declaration, 'appStatements', appStmnt =>
      compileNode(appStmnt)`
        function _AppUIView() {
          return <${appStmnt.ui.ref!.name} />
        }; export const AppUIView = _AppUIView // TODO: Remove this
      `)
  }

  ModuleDeclaration(moduleDecl: AST.ModuleDeclaration): Compiled {
    const visibility = compileNodeProperty(moduleDecl, 'visibility', (val) => val ? 'export ' : '')
    const declaration = this.Declaration(moduleDecl.declaration)
    return compileNode(moduleDecl)`
      ${visibility}${declaration}
    `
  }

  // Actions
  //////////

  ActionDeclaration(declaration: AST.ActionDeclaration): Compiled {
    const parameterList = compileParameterList(declaration.parameterList)
    const block = this.Block(declaration.block)
    return compileNode(declaration)`
      const ${declaration.name} = TaoRuntime.Action(function ${declaration.name}(${parameterList}) {
        ${block}
      })
    `
  }

  StateDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    const name = compileRefName(declaration)
    const value = this.Expression(declaration.value)
    return compileNode(declaration)`
      const ${name} = TaoRuntime.useState(${value});
    `
  }

  StateUpdate(update: AST.StateUpdate): Compiled {
    const stateRef = compileRefName(update.stateRef)
    const op = compileNodeProperty(update, 'op')
    const value = this.Expression(update.value)
    return compileNode(update)`
      TaoRuntime.updateState(${stateRef}, '${op}', ${value})
    `
  }

  // Views
  ////////

  ViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
    const stmts = declaration.block.statements
    const viewBlockStatements = stmts.filter(s => !AST.isViewRender(s))
    const renderStatements = stmts.filter(AST.isViewRender)
    return compileNode(declaration)`
      function ${declaration.name}(${compileParameterList(declaration.parameterList)}) {
        ${compileNodeList(viewBlockStatements, stmt => this.Statement(stmt))}
        return <>${compileNodeList(renderStatements, stmt => this.Statement(stmt))}</>
      }`
  }

  ViewRender(viewRender: AST.ViewRender): Compiled {
    return compileNodePropertyRef(viewRender, 'view', viewDecl => {
      return compileNode(viewDecl)`
      <${viewDecl.name} ${this.ArgumentList(viewRender.argumentList)}>
        ${this.Block(viewRender.block)}
      </${viewDecl.name}>`
    })
  }

  Injection(injection: AST.Injection): Compiled {
    return compileNodeProperty(injection, 'tsCodeBlock', (content) => this.trimTsFence(content))
  }

  /** trimTsFence normalizes ```ts fences to commented markers for embedding. */
  private trimTsFence(content: string) {
    const fenced = content.replace(/^```ts/g, '\n/* ```ts */\n').replace(/ *```$/g, '\n/* ``` */')
    return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n/* ``` */', '\n/* ``` */')
  }

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
