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
import * as LangiumGen from '@parser/generate'
import { AST } from '@parser/parser'
import { Stream } from '@shared'
import { assertNever, switchProperty_Exhaustive, switchType_Exhaustive } from '@shared/TypeSafety'
import { compileTODO } from '../codegen-util'

export function compileTaoFile(taoFile: AST.TaoFile): Compiled {
  return new RuntimeGen().TaoFile(taoFile)
}

class RuntimeGen {
  TODO(node: AST.Node): Compiled {
    return compileTODO(node)
  }

  TaoFile(taoFile: AST.TaoFile): Compiled {
    return compileNode(taoFile)`
      ${this.taoFileScope(taoFile)}
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
        return compileNode(node)`${this.scopedName(node)}.read()`
      },
    })
  }

  // Expression Declarations
  //////////////////////////

  AssignmentDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    return switchProperty_Exhaustive(declaration, 'type', {
      alias: () => this.Declaration_alias(declaration),
      state: () => this.Declaration_state(declaration),
    })
  }

  Declaration_alias(declaration: AST.AssignmentDeclaration): Compiled {
    const value = this.Expression(declaration.value)
    return compileNode(declaration)`
      ${this.scopedName(declaration)} = TaoRuntime.Alias(${value});
    `
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
    const scopedName = this.scopedName(declaration)
    if (!isBlockWithStatements(declaration.block)) {
      return compileNode(declaration)`
        ${scopedName} = TaoRuntime.Action(function ${declaration.name}(Scope: any) {})
      `
    }
    const scopedBlock = this.Block(declaration.block)
    return compileNode(declaration)`
      ${scopedName} = TaoRuntime.Action(function ${declaration.name}(Scope: any)${scopedBlock})
    `
  }

  Declaration_state(declaration: AST.AssignmentDeclaration): Compiled {
    const name = this.scopedName(declaration)
    const value = this.Expression(declaration.value)
    return AST.isTaoFile(declaration.$container)
      ? compileNode(declaration)`
        ${name} = TaoRuntime.TopLevelState(${value});
      `
      : compileNode(declaration)`
        ${name} = TaoRuntime.useViewState(${value});
      `
  }

  StateUpdate(update: AST.StateUpdate): Compiled {
    const op = compileNodeProperty(update, 'op')
    const value = this.Expression(update.value)
    return compileNode(update)`
      TaoRuntime.updateState(${this.scopedName(update.stateRef)}, '${op}', ${value})
    `
  }

  // Views
  ////////

  ViewDeclaration(declaration: AST.ViewDeclaration): Compiled {
    const block = declaration.block
    const declarations = this.streamTree(block)
      .filterIs(AST.isDeclaration)
    const useBindingRefs = this.streamTree(block)
      .filterIs(AST.isNamedReference)
    const liveStateBindings = this.streamTree(block)
      .filterIs(AST.isLiveStateBinding)
    const renderNodes = this.streamTree(block)
      .filterIs(AST.isRenderNode)

    return this.scoped(() =>
      compileNode(declaration)`
        function ${declaration.name}(${this.ViewParameterList(declaration.parameterList)}) {
          ${this.pushScopeDeclaration(declaration.block)}
          ${compileNodeList(declarations, declaration => this.Declaration(declaration))}
          ${compileNodeList(useBindingRefs, ref => this.view_useBinding(ref))}
          ${compileNodeList(liveStateBindings, binding => this.view_liveStateBinding(binding))}
          return <>
            ${compileNodeList(renderNodes, renderNode => this.view_renderNode(renderNode))}
          </>
        }
      `
    )
  }

  view_liveStateBinding(binding: AST.LiveStateBinding): Compiled {
    const state = binding.stateRef
    const declName = this.declarationName(state.ref!)
    return compileNode(binding)`${this.scopedName(state)} = ${declName}.useState(Scope)`
  }

  view_useBinding(ref: AST.NamedReference): Compiled {
    return compileNode(ref)`
      ${this.useReference(ref.referenceName)} = ${this.declarationName(ref.referenceName.ref!)}.useState(Scope)
    `
  }

  view_renderNode(renderNode: AST.ViewRender | AST.Injection): Compiled {
    return switchType_Exhaustive(renderNode, {
      ViewRender: (stmt) => this.ViewRender(stmt),
      Injection: (stmt) => compileNode(stmt)`{${this.Injection(stmt)}}`,
    })
  }

  /** ViewParameterList emits the view's props destructuring with the implicit _taoScope prop. */
  ViewParameterList(_parameterList: AST.ParameterList | undefined): Compiled {
    return new LangiumGen.CompositeGeneratorNode('{ _taoScope, ...props }: any')
  }

  ViewRender(viewRender: AST.ViewRender): Compiled {
    return compileNodePropertyRef(viewRender, 'view', viewDecl => {
      const argumentList = this.ArgumentList(viewRender.argumentList)
      const scopeProp = this.viewScopeProp(viewDecl)
      if (!isBlockWithStatements(viewRender.block)) {
        return compileNode(viewDecl)`
          <${viewDecl.name}${scopeProp}${argumentList} />
        `
      } else {
        return compileNode(viewDecl)`
          <${viewDecl.name}${scopeProp}${argumentList}>
            ${compileNodeList(viewRender.block.statements, stmt => this.viewRenderBlockStatement(stmt))}
          </${viewDecl.name}>
        `
      }
    })
  }

  viewRenderBlockStatement(stmt: AST.Statement): Compiled {
    if (AST.isDeclaration(stmt)) {
      // Declarations are hoisted in views, so ignore it here
      return compileNode(stmt)`/* ${stmt.name} = ${stmt.type} */`
    }
    return this.Statement(stmt)
  }

  // Scope
  ////////

  private declScope = '_fileScope'

  taoFileScope(taoFile: AST.TaoFile): Compiled {
    return compileNode(taoFile)`
      const _fileScope: Record<string, any> = {}
    `
  }

  viewScopeProp(declaration: AST.Declaration): Compiled {
    if (!isNestedDeclaration(declaration)) {
      return compileNoop()
    }
    return compileNode(declaration)` _taoScope={Scope}`
  }

  scoped(fn: () => Compiled): Compiled {
    const prevScope = this.declScope
    this.declScope = 'Scope'
    const compiled = fn()
    this.declScope = prevScope
    return compiled
  }

  pushScopeDeclaration(block: AST.Block): Compiled {
    return compileNode(block)`
      const Scope = TaoRuntime.pushScope(_taoScope ?? _fileScope)
    `
  }

  // TODO: Ro: "I don't fully understand this function.
  // Are all the different reference types necessary?
  // Should we simplify the grammar and eliminate some?"
  scopedName(
    node: (AST.Declaration) | (AST.NamedReference) | (AST.Referenceable | AST.Reference<AST.Referenceable>),
  ): Compiled {
    if (AST.isDeclaration(node)) {
      return this.declarationName(node)
    } else if (AST.isReference(node)) {
      return this.useReference(node)
    } else if (AST.isNamedReference(node)) {
      return this.useReference(node.referenceName)
    } else if (AST.isReferenceable(node)) {
      return this.useReferenceable(node)
    }
    assertNever(node)
  }

  useReference(node: AST.Reference<AST.Referenceable>): Compiled {
    return this.useReferenceable(node.ref!)
  }

  useReferenceable(node: AST.Referenceable): Compiled {
    const name = compileNodeProperty(node, 'name')
    return compileNode(node)`${this.declScope}.${name}_use`
  }

  declarationName(node: AST.Node & { name: string }): Compiled {
    return compileNode(node)`${this.declScope}.${node.name}`
  }

  // Shared statements
  ////////////////////

  Block(block?: AST.Block): Compiled {
    if (!block) {
      return compileNoop()
    }
    return this.scoped(() =>
      compileNode(block)`
      {
        ${compileNodeList(block.statements, stmt => this.Statement(stmt))}
      }`
    )
  }

  ArgumentList(argumentList?: AST.ArgumentList): Compiled | undefined {
    return compileNodeListPropertyOptional(argumentList, 'arguments', argument => {
      return compileNode(argument)`
        /**/${argument.name} = {${this.Expression(argument.value)}}
      `
    })
  }

  Injection(injection: AST.Injection): Compiled {
    const trimmedTsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFence)
    return switchProperty_Exhaustive(injection, 'type', {
      raw: () => (compileNode(injection)`
        ${trimmedTsCodeBlock}
      `),
      undefined: () => (compileNode(injection)`
        (function() {
          ${trimmedTsCodeBlock}
        })()
      `),
    })
  }

  Debugger(Debugger: AST.Debugger): Compiled {
    return compileNode(Debugger)` debugger `
  }

  // Helper functions
  ///////////////////

  // AST Tree traversal

  streamTree(node: AST.Node): Stream<AST.Node> {
    const iterator = AST.Utils.streamAllContents(node).iterator()
    return Stream.fromIterator(iterator)
  }
}

/** BlockWithStatements is a block with at least one statement. */
type BlockWithStatements = AST.Block & {
  statements: [AST.Statement, ...AST.Statement[]]
}

/** isBlockWithStatements returns true when there's a block and it has at least one statement. */
function isBlockWithStatements(block: AST.Block | undefined): block is BlockWithStatements {
  return block !== undefined && block.statements.length > 0
}

/** isNestedDeclaration returns true when the declaration lives inside another declaration (not at file/module level). */
function isNestedDeclaration(decl: AST.Declaration): boolean {
  return AST.isBlock(decl.$container)
}

/** trimTsFence normalizes ```ts fences to commented markers for embedding. */
function trimTsFence(content: string) {
  const fenced = content.replace(/^```ts/g, '\n/* ```ts */\n').replace(/ *```$/g, '\n/* ``` */')
  return fenced.replace('```ts\n\n', '```ts\n').replace('\n\n/* ``` */', '\n/* ``` */')
}
