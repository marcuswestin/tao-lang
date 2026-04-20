import {
  Compiled,
  compileIndentedNodeList,
  compileInlineNodeList,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  compileNodeProperty,
  compileNodePropertyRef,
  compileNoop,
  CompositeGeneratorNode,
} from '@compiler/codegen/codegen-util'
import { AST } from '@parser/parser'
import { Assert, Iterable as _Iterable, Stream, switch_safe } from '@shared'
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
    return switch_safe.type(statement, {
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
    return switch_safe.type(declaration, {
      AssignmentDeclaration: (n) => this.AssignmentDeclaration(n),
      AppDeclaration: (n) => this.AppDeclaration(n),
      ActionDeclaration: (n) => this.ActionDeclaration(n),
      ViewDeclaration: (n) => this.ViewDeclaration(n),
    })
  }

  /** Expression compiles a Tao expression to JS. `render` subscribes during React render, `peek` reads synchronously (actions, file init). */
  Expression(expression: AST.Expression): Compiled {
    return switch_safe.type(expression, {
      BinaryExpression: (node) => {
        const left = this.Expression(node.left)
        const right = this.Expression(node.right)
        return compileNode(node)`TR.BinaryOperation(${left}, '${node.op}', ${right})`
      },
      UnaryExpression: (node) => {
        const operand = this.Expression(node.operand)
        return compileNode(node)`TR.UnaryOperation('${node.op}', ${operand})`
      },
      StringLiteral: (node) => {
        return compileNode(node)`TR.Literal('${node.string}')`
      },
      NumberLiteral: (node) => {
        return compileNode(node)`TR.Literal(${node.number})`
      },
      NamedReference: (node) => {
        return compileNode(node)`_Scope.${node.referenceName.$refText}`
      },
      ActionExpression: (node) => this.ActionExpression(node),
    })
  }

  // Expression Declarations
  //////////////////////////

  AssignmentDeclaration(declaration: AST.AssignmentDeclaration): Compiled {
    return switch_safe.property(declaration, 'type', {
      alias: () => this.Declaration_alias(declaration),
      state: () => this.Declaration_state(declaration),
    })
  }

  Declaration_alias(declaration: AST.AssignmentDeclaration): Compiled {
    const value = this.Expression(declaration.value)
    return compileNode(declaration)`
      ${this.scopedName(declaration)} = TR.Alias(${value})
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

  /** ActionExpression compiles an inline `action` expression (e.g. a view argument) the same way as a block body action. */
  ActionExpression(node: AST.ActionExpression): Compiled {
    return this.actionLiteral(node, node.name)
  }

  ActionDeclaration(declaration: AST.ActionDeclaration): Compiled {
    const scopedName = this.scopedName(declaration)
    return compileNode(declaration)`
        ${scopedName} = ${this.actionLiteral(declaration, declaration.name)}
      `
  }

  actionLiteral(node: AST.ActionExpression | AST.ActionDeclaration, name: string | undefined): Compiled {
    const nameStr = name ? ` ${name}` : ''
    if (!isBlockWithStatements(node.block)) {
      return compileNode(node)`TR.Action(function${nameStr}() {})`
    }
    return compileNode(node)`TR.Action(function${nameStr}() ${this.Block(node.block)})`
  }

  Declaration_state(declaration: AST.AssignmentDeclaration): Compiled {
    const name = this.scopedName(declaration)
    const value = this.Expression(declaration.value)
    return AST.isTaoFile(declaration.$container)
      ? compileNode(declaration)`
        ${name} = TR.AppState(${value})
      `
      : compileNode(declaration)`
        ${name} = TR.ViewState(${value})
      `
  }

  StateUpdate(update: AST.StateUpdate): Compiled {
    const operator = compileNodeProperty(update, 'operator')
    const value = this.Expression(update.value)
    return compileNode(update)`
      _Scope.${update.stateRef.ref!.name}.updateValue('${operator}', ${value})
    `
  }

  // Views
  ////////

  ViewDeclaration(viewDeclaration: AST.ViewDeclaration): Compiled {
    const { block, name, parameterList } = viewDeclaration

    const declarations = this.streamAllDescendantsOf(block)
      .filterIs(AST.isDeclaration).toArray()

    const bindings = this.streamAllDescendantsOf(block)
      .filterIs(AST.isReactiveBinding)
      .filter(isMutableStateReference)
      .map(reactiveBindingToReferenceable)
      .unique()

    const renderNodes = this.streamBlockStatements(block)
      .filterIs(AST.isRenderNode)

    const params = this.ViewParameterList(parameterList)

    return this.scoped(() =>
      compileNode(viewDeclaration)`
        const ${name} = TR.BlockScope(_Scope, (_Scope) => {
          return function ${name}_View(${params}) {
            ${this.typeDeclarations(viewDeclaration, declarations)}
            ${compileNodeList(declarations, declaration => this.Declaration(declaration))}
            ${compileNodeList(bindings, decl => this.reactiveBinding(decl))}
            return <>
              ${compileNodeList(renderNodes, renderNode => this.renderNode(renderNode))}
            </>
          }
        })
      `
    )
  }

  typeDeclarations(viewDeclaration: AST.ViewDeclaration, declarations: AST.Declaration[]): Compiled {
    return compileNode(viewDeclaration)`
      TR.Declare<typeof _Scope, {
        ${compileIndentedNodeList(declarations, declaration => this.typeDeclaration(declaration))}
      }>(_Scope)
    `
  }

  typeDeclaration(declaration: AST.Declaration): Compiled {
    const runtimeType = this.runtimeTypes[declaration.type]
    return compileNode(declaration)`
      ${declaration.name}: ReturnType<_TaoRuntime['${runtimeType}']>
    `
  }

  runtimeTypes = {
    alias: 'Alias',
    state: 'AppState',
    action: 'Action',
    view: 'ViewState',
    app: '<unsupported in runtimeTypes>',
  } as const

  reactiveBinding(decl: AST.Referenceable): Compiled {
    return compileNode(decl)`_Scope.${decl.name}.useReactiveHandle()`
  }

  renderNode(renderNode: AST.ViewRender | AST.Injection): Compiled {
    return switch_safe.type(renderNode, {
      ViewRender: (stmt) => this.ViewRender(stmt),
      Injection: (stmt) => compileNode(stmt)`{ ${this.Injection(stmt)} }`,
    })
  }

  /** ViewParameterList emits the view's properties destructuring with the implicit _taoScope prop. */
  ViewParameterList(_parameterList: AST.ParameterList | undefined): Compiled {
    return new CompositeGeneratorNode('_ViewProps: any')
  }

  ViewRender(viewRender: AST.ViewRender): Compiled {
    return compileNodePropertyRef(viewRender, 'view', viewDecl => {
      const argumentList = this.ArgumentList(viewRender.argumentList)
      const scopeProp = this.viewScopeProp(viewDecl)
      if (!isBlockWithStatements(viewRender.block)) {
        return compileNode(viewRender)`
          <${viewDecl.name}${scopeProp} ${argumentList}/>
        `
      } else {
        return compileNode(viewRender)`
          <${viewDecl.name}${scopeProp} ${argumentList}>
            ${compileNodeList(viewRender.block.statements, stmt => this.viewRenderBlockStatement(stmt))}
          </${viewDecl.name}>
        `
      }
    })
  }

  viewRenderBlockStatement(stmt: AST.Statement): Compiled {
    if (AST.isDeclaration(stmt)) {
      // Declarations are hoisted in views, so ignore it here
      return compileNoop()
    }
    if (AST.isViewRender(stmt)) {
      return this.renderNode(stmt)
    }
    if (AST.isInjection(stmt)) {
      return compileNode(stmt)`{${this.Injection(stmt)}}`
    }
    return this.Statement(stmt)
  }

  // Scope
  ////////

  private declScope = '_Scope'

  taoFileScope(taoFile: AST.TaoFile): Compiled {
    return compileNode(taoFile)`
      const _Scope: Record<string, any> = {}
    `
  }

  viewScopeProp(declaration: AST.Declaration): Compiled {
    if (!isNestedDeclaration(declaration)) {
      return compileNoop()
    }
    return compileNode(declaration)` _ViewScope={_Scope}`
  }

  scoped(fn: () => Compiled): Compiled {
    const prevScope = this.declScope
    this.declScope = '_Scope'
    const compiled = fn()
    this.declScope = prevScope
    return compiled
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
    Assert.never(node)
  }

  useReference(node: AST.Reference<AST.Referenceable>): Compiled {
    return this.useReferenceable(node.ref!)
  }

  useReferenceable(node: AST.Referenceable): Compiled {
    const name = compileNodeProperty(node, 'name')
    return compileNode(node)`${this.declScope}.${name}`
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
    if (!argumentList) {
      return compileNoop()
    }
    return compileInlineNodeList(argumentList.arguments, argument => {
      return compileNode(argument)`
        ${argument.name}={${this.Expression(argument.value)}}
      `.append(' ')
    })
  }

  Injection(injection: AST.Injection): Compiled {
    const trimmedTsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', trimTsFence)
    return switch_safe.property(injection, 'type', {
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
    return compileNode(Debugger)`
      debugger
    `
  }

  // Helper functions
  ///////////////////

  // AST Tree traversal

  private streamAllDescendantsOf(node: AST.Node): Stream<AST.Node> {
    const iterator = AST.Utils.streamAllContents(node).iterator()
    return Stream.fromIterator(iterator)
  }

  private streamBlockStatements(block: AST.Block): Stream<AST.Statement> {
    return Stream.fromArray(block.statements)
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

function isMutableStateReference(node: AST.ReactiveBinding): boolean {
  return AST.isStateUpdate(node) || (AST.isNamedReference(node) && node.referenceName.ref?.type === 'state')
}

function reactiveBindingToReferenceable(node: AST.ReactiveBinding): AST.Referenceable {
  return switch_safe.type(node, {
    NamedReference: (n) => n.referenceName.ref!,
    StateUpdate: (n) => n.stateRef.ref!,
  }) as AST.Referenceable
}
