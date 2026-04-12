import {
  Compiled,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  compileNodeListPropertyOptional,
  compileNodeProperty,
  compileNodePropertyRef,
  compileNoop,
} from '@compiler/codegen/codegen-util'
import { langium } from '@compiler/util/libs'
import { AST } from '@parser'
import { switchProperty_Exhaustive, switchType_Exhaustive } from '@shared/TypeSafety'
import { AstNode, AstUtils } from 'langium'
import * as LangiumGen from 'langium/generate'
import { compileTODO } from '../codegen-util'

export function compileTaoFile(taoFile: AST.TaoFile): Compiled {
  return new RuntimeGen().TaoFile(taoFile)
}

class RuntimeGen {
  TODO(node: langium.AstNode): Compiled {
    return compileTODO(node)
  }

  TaoFile(taoFile: AST.TaoFile): Compiled {
    return compileNode(taoFile)`
      ${compileNodeListProperty(taoFile, 'statements', stmt => this.Statement(stmt))}
    `
  }

  Statement(statement: AST.Statement): Compiled {
    return switchType_Exhaustive(statement, {
      Injection: (n) => this.Injection(n),
      Debugger: (n) => this.Debugger(n),
      StateUpdate: (n) => this.StateUpdate(n),
      ModuleDeclaration: (n) => this.ModuleDeclaration(n),
      UseStatement: (n) => this.UseStatement(n),
      AppDeclaration: (n) => this.AppDeclaration(n),
      AssignmentDeclaration: (n) => this.AssignmentDeclaration(n),
      ViewDeclaration: (n) => this.ViewDeclaration(n),
      ActionDeclaration: (n) => this.ActionDeclaration(n),
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
          TaoRuntime.StringLiteral(${JSON.stringify(node.string)}).read()
        `
      },
      NumberLiteral: (node) => {
        return compileNode(node)`
          TaoRuntime.NumberLiteral(${JSON.stringify(node.number)}).read()
        `
      },
      NamedReference: (node) => {
        // Prefer the linked declaration’s name when the reference is resolved; fall back to the
        // reference token text when `ref` is missing so codegen does not throw on unresolved refs
        // (partial workspace, broken files, or pre-scope-computation runs).
        const id = node.referenceName.ref?.name ?? node.referenceName.$refText
        return compileNode(node)`
          ${id}_use.read()
        `
      },
    })
  }

  // Shared statements
  ////////////////////

  AssignmentDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    return switchProperty_Exhaustive(declaration, 'type', {
      alias: () => this.Declaration_alias(declaration),
      state: () => this.Declaration_state(declaration),
    })
  }

  Declaration_alias(declaration: AST.AssignmentDeclaration): Compiled {
    // TODO: const ${name} = TaoRuntime.${declaration.$type}_Constructor(${value});
    const name = this.compileRefName(declaration)
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
        /**/${argument.name} = {${this.Expression(argument.value)}}
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
    const declaration = this.Statement(moduleDecl.declaration)
    return compileNode(moduleDecl)`
      ${visibility}${declaration}
    `
  }

  // Actions
  //////////

  ActionDeclaration(declaration: AST.ActionDeclaration): Compiled {
    const parameterList = this.ParameterList(declaration.parameterList)
    const block = this.Block(declaration.block)
    const name = declaration.name
    return compileNode(declaration)`
      const ${name} = TaoRuntime.Action(function ${name}(${parameterList}) {
        ${block}
      })
    `
  }

  ParameterList(parameterList: AST.ParameterList | undefined): Compiled {
    if (!parameterList) {
      return new LangiumGen.CompositeGeneratorNode('props: unknown')
    }
    return compileNode(parameterList)`
    props: {${
      compileNodeListProperty(parameterList, 'parameters', param => {
        return compileNode(param)`${param.name}: ${param.type}`
      })
    }}
  `
  }

  Declaration_state(declaration: AST.AssignmentDeclaration): Compiled {
    const name = this.compileRefName(declaration)
    const value = this.Expression(declaration.value)
    if (AST.isTaoFile(declaration.$container)) {
      return compileNode(declaration)`
        const ${name} = TaoRuntime.TopLevelState(${value});
      `
    } else {
      return compileNode(declaration)`
        const ${name} = TaoRuntime.useViewState(${value});
      `
    }
  }

  StateUpdate(update: AST.StateUpdate): Compiled {
    const stateRef = this.compileRefName(update.stateRef)
    const op = compileNodeProperty(update, 'op')
    const value = this.Expression(update.value)
    return compileNode(update)`
      TaoRuntime.updateState(${stateRef}_use, '${op}', ${value})
    `
  }

  compileRefName(ref: AST.Referenceable | langium.Reference<AST.Referenceable>) {
    if (langium.isReference(ref)) {
      ref = ref.ref!
    }
    return compileNodeProperty(ref, 'name') // TODO: .prepend(`${ref.$type}_`)
  }
  // Node List Property Generator functions
  /////////////////////////////////////////

  // Views
  ////////

  ViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
    const declarations = Array.from(this.filterNodeTree(declaration.block, AST.isDeclaration))
    const expressions = Array.from(this.filterNodeTree(declaration.block, AST.isExpression))
    const renderNodes = Array.from(
      this.filterNodeChildren(declaration.block, n => AST.isViewRender(n) || AST.isInjection(n)),
    )
    return compileNode(declaration)`
      function ${declaration.name}(${this.ParameterList(declaration.parameterList)}) {
        ${compileNodeList(declarations, declaration => this.Declaration(declaration))}
         ${compileNodeList(expressions, stmt => this.useViewExpression(stmt))}
          return <>${compileNodeList(renderNodes, renderNode => this.renderNode(renderNode))}</>
    }`
  }

  renderNode(renderNode: AST.ViewRender | AST.Injection): Compiled {
    return switchType_Exhaustive(renderNode, {
      ViewRender: (stmt) => this.ViewRender(stmt),
      Injection: (stmt) => compileNode(stmt)`{${this.Injection(stmt)}}`,
    })
  }

  ViewRender(viewRender: AST.ViewRender): Compiled {
    return compileNodePropertyRef(viewRender, 'view', viewDecl => {
      return compileNode(viewDecl)`
      <${viewDecl.name}${this.ArgumentList(viewRender.argumentList)}>
        ${
        viewRender.block && compileNodeList(viewRender.block?.statements, stmt => {
          if (AST.isDeclaration(stmt)) {
            return compileNoop()
          } else {
            return this.Statement(stmt)
          }
        })
      }
      </${viewDecl.name}>`
    })
  }

  useViewExpression(expression: AST.Expression): Compiled {
    return switchType_Exhaustive(expression, {
      NamedReference: (ref) => (compileNode(ref)`
        const ${ref.referenceName.$refText}_use = ${ref.referenceName.$refText}.useState();
      `),
      NumberLiteral: compileNoop,
      StringLiteral: compileNoop,
    })
  }

  *filterNodeChildren<FilterT extends AstNode>(node: AstNode, predicate: (node: AstNode) => node is FilterT) {
    for (const child of AstUtils.streamContents(node)) {
      if (predicate(child)) {
        yield child
      }
    }
  }
  *walkTree<NodeT extends AstNode>(node: NodeT): Generator<NodeT, void, unknown> {
    for (const child of AstUtils.streamAllContents(node)) {
      yield child as NodeT
    }
  }
  *filterNodeTree<FilterT extends AstNode>(
    node: AstNode,
    predicate: (node: AstNode) => node is FilterT,
  ) {
    for (const child of this.walkTree(node)) {
      if (predicate(child)) {
        yield child
      }
    }
  }

  Injection(injection: AST.Injection): Compiled {
    return switchProperty_Exhaustive(injection, 'type', {
      raw: () => (compileNode(injection)`
        ${compileNodeProperty(injection, 'tsCodeBlock', (content) => this.trimTsFence(content))}
      `),
      undefined: () => (compileNode(injection)`
        (function() {
          ${compileNodeProperty(injection, 'tsCodeBlock', (content) => this.trimTsFence(content))}
        })()
      `),
    })
  }

  Debugger(Debugger: AST.Debugger): Compiled {
    return compileNode(Debugger)` debugger `
  }

  /** trimTsFence normalizes ```ts fences to commented markers for embedding. */
  private trimTsFence(content: string) {
    const fenced = content.replace(/^```ts/g, '\n/* ```ts */\n').replace(/ *```$/g, '\n/* ``` */')
    return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n/* ``` */', '\n/* ``` */')
  }
}
