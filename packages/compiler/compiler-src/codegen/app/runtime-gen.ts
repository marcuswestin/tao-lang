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
import { parameterName } from '@compiler/tao-type-shapes'
import { resolveArgumentBindings } from '@compiler/typing/tao-argument-bindings'
import { AST } from '@parser/parser'
import { Iterable as _Iterable, Stream, switch_safe } from '@shared'
import { throwUnexpectedBehaviorError } from '@shared/TaoErrors'
import { compileTODO } from '../codegen-util'
import { decodeTaoTemplateTextChunk } from '../tao-template-text-chunk'

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
      ActionRender: (n) => this.ActionRender(n),
      TypeDeclaration: (n) => this.TypeDeclaration(n),
    })
  }

  Declaration(declaration: AST.Declaration): Compiled {
    return switch_safe.type(declaration, {
      AssignmentDeclaration: (n) => this.AssignmentDeclaration(n),
      AppDeclaration: (n) => this.AppDeclaration(n),
      ActionDeclaration: (n) => this.ActionDeclaration(n),
      ViewDeclaration: (n) => this.ViewDeclaration(n),
      TypeDeclaration: (n) => this.TypeDeclaration(n),
    })
  }

  /** TypeDeclaration emits nothing at runtime — nominal types are a compile-time construct only. */
  TypeDeclaration(node: AST.TypeDeclaration): Compiled {
    return compileNode(node)``
  }

  /** objectLiteralRuntime emits `TR.Object({ … })` for a Tao object literal (shared by expressions, assignments, nested properties, and `${…}` holes). */
  private objectLiteralRuntime(node: AST.ObjectLiteral): Compiled {
    return compileNode(node)`TR.Object({
      ${compileIndentedNodeList(node.properties, prop => this.ObjectProperty(prop))}
    })`
  }

  /** templateInterpolatedExpr compiles a `${…}` expression hole (`Expression` or nested `ObjectLiteral`). */
  private templateInterpolatedExpr(node: AST.Expression | AST.ObjectLiteral): Compiled {
    if (AST.isObjectLiteral(node)) {
      return this.objectLiteralRuntime(node)
    }
    return this.Expression(node)
  }

  /** assignmentDeclarationValue compiles `alias` / `state` RHS, which may be a bare `ObjectLiteral` (not an `Expression`). */
  private assignmentDeclarationValue(declaration: AST.AssignmentDeclaration): Compiled {
    const v = declaration.value
    if (AST.isObjectLiteral(v)) {
      return this.objectLiteralRuntime(v)
    }
    return this.Expression(v)
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
      NumberLiteral: (node) => {
        return compileNode(node)`TR.Literal(${node.number})`
      },
      StringTemplateExpression: (node) => this.StringTemplateExpression(node),
      MemberAccessExpression: (node) => this.MemberAccessExpression(node),
      ActionExpression: (node) => this.ActionExpression(node),
      TypedLiteralExpression: (node) => {
        const v = node.value
        if (AST.isObjectLiteral(v)) {
          return this.objectLiteralRuntime(v)
        }
        return this.Expression(v)
      },
    })
  }

  /** StringTemplateExpression compiles `"…${…}…"` to `TR.StringTemplate`. Trivial pure-text templates collapse to `TR.Literal` for cheaper emission. */
  StringTemplateExpression(node: AST.StringTemplateExpression): Compiled {
    if (node.segments.length === 0) {
      return compileNode(node)`TR.Literal("")`
    }
    if (node.segments.length === 1) {
      const only = node.segments[0]!
      if (only.text !== undefined && only.expression === undefined) {
        const decoded = decodeTaoTemplateTextChunk(only.text)
        return compileNode(node)`TR.Literal(${JSON.stringify(decoded)})`
      }
    }
    return compileNode(node)`TR.StringTemplate([
      ${compileIndentedNodeList(node.segments, seg => this.StringTemplatePart(seg))}
    ])`
  }

  /** StringTemplatePart emits one `TR.StringTemplate` array element (either literal text or an interpolated expression).
   * The grammar (`text=TEMPLATE_TEXT | INTERP_START expression=(ObjectLiteral | Expression) '}'`) guarantees exactly one of `text` /
   * `expression` is set; `throwUnexpectedBehaviorError` below locks that invariant to surface any future grammar drift. */
  StringTemplatePart(seg: AST.StringTemplateSegment): Compiled {
    if (seg.expression !== undefined && seg.text === undefined) {
      const expr = this.templateInterpolatedExpr(seg.expression)
      return compileNode(seg)`{ kind: 'expr', expr: ${expr} },`
    }
    if (seg.text !== undefined && seg.expression === undefined) {
      const decoded = decodeTaoTemplateTextChunk(seg.text)
      return compileNode(seg)`{ kind: 'text', value: ${JSON.stringify(decoded)} },`
    }
    throwUnexpectedBehaviorError({
      humanMessage: 'StringTemplateSegment must have exactly one of `text` or `expression` set (grammar invariant).',
      cause: new Error('CodegenInvariantError'),
    })
  }

  /** MemberAccessExpression compiles `Name` or `Name.a.b.c` against the current scope. Bare names (empty path) resolve directly; chains wrap with `TR.MemberAccess`. */
  MemberAccessExpression(node: AST.MemberAccessExpression): Compiled {
    const rootExpr = compileNode(node)`_Scope.${node.root.$refText}`
    if (node.properties.length === 0) {
      return rootExpr
    }
    const pathList = node.properties.map(p => `'${p}'`).join(', ')
    return compileNode(node)`TR.MemberAccess(${rootExpr}, [${pathList}])`
  }

  ObjectProperty(property: AST.ObjectProperty): Compiled {
    const val = AST.isObjectLiteral(property.value)
      ? this.objectLiteralRuntime(property.value)
      : this.Expression(property.value)
    return compileNode(property)`
      ${property.name}: ${val},
    `
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
    const value = this.assignmentDeclarationValue(declaration)
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

  /** ActionExpression compiles an inline anonymous `action` expression (e.g. a view argument) the same way as a block body action. */
  ActionExpression(node: AST.ActionExpression): Compiled {
    return this.actionLiteral(node, undefined)
  }

  ActionDeclaration(declaration: AST.ActionDeclaration): Compiled {
    const scopedName = this.scopedName(declaration)
    return compileNode(declaration)`
        ${scopedName} = ${this.actionLiteral(declaration, declaration.name)}
      `
  }

  /** actionLiteral emits the runtime form for `action Name P1 t1, P2 t2 { … }` and `action { … }` literals.
   * Parameterized actions take a `_ActionProps` bag at invocation time and inject those values as own
   * properties of a fresh `BlockScope`, so member access inside the body (`_Scope.<ParamName>`) resolves to
   * the caller-supplied value while `set X = …` continues to write to the enclosing scope through prototype
   * lookup. The `_ActionProps` bag is a record of evaluated `TR.Expression` values; the codegen-side
   * resolver in `tao-argument-bindings.ts` keys it on the resolved parameter name. */
  actionLiteral(node: AST.ActionExpression | AST.ActionDeclaration, name: string | undefined): Compiled {
    const nameStr = name ? ` ${name}` : ''
    const params = AST.isActionDeclaration(node) ? (node.parameterList?.parameters ?? []) : []
    const propsArg = params.length > 0 ? '_ActionProps' : ''
    if (!isBlockWithStatements(node.block)) {
      return compileNode(node)`TR.Action(function${nameStr}(${propsArg}) {})`
    }
    if (params.length === 0) {
      return compileNode(node)`TR.Action(function${nameStr}() ${this.Block(node.block)})`
    }
    return compileNode(node)`TR.Action(function${nameStr}(_ActionProps) {
      ${this.actionParameterizedBlock(node.block, params)}
    })`
  }

  /** actionParameterizedBlock emits the body of a parameterized action: a fresh `BlockScope` whose own
   * properties are the action's parameters bound from the invocation `_ActionProps` bag. */
  private actionParameterizedBlock(
    block: AST.Block,
    params: readonly AST.ParameterDeclaration[],
  ): Compiled {
    const paramBindings = compileNodeList(params, p =>
      compileNode(p)`
        _Scope.${parameterName(p)} = _ActionProps.${parameterName(p)}
      `)

    return this.scoped(() =>
      compileNode(block)`
      TR.BlockScope(_Scope, (_Scope) => {
        ${paramBindings}
        ${compileNodeList(block.statements, stmt => this.Statement(stmt))}
      })`
    )
  }

  /** ActionRender compiles `do TargetAction Param1 v1, …` to `_Scope.<Name>.invoke({ … })`, optionally followed
   * by a nested `block` of action statements (same scope as the invocation). Argument-binding maps each
   * `Argument` to the callee `ParameterDeclaration` so the props object uses resolved parameter names. */
  ActionRender(node: AST.ActionRender): Compiled {
    return compileNodePropertyRef(node, 'action', actionDecl => {
      if (!AST.isActionDeclaration(actionDecl)) {
        throwUnexpectedBehaviorError({
          humanMessage: 'ActionRender callee must resolve to an action declaration after validation.',
          cause: new Error('CodegenInvariantError'),
        })
      }
      const propsBag = this.actionRenderPropsBag(node, actionDecl)
      const invoke = compileNode(node)`_Scope.${actionDecl.name}.invoke(${propsBag})`
      if (!isBlockWithStatements(node.block)) {
        return invoke
      }
      return compileNode(node)`
        ${invoke}
        ${this.Block(node.block)}
      `
    })
  }

  /** actionRenderPropsBag emits `{ ParamName: <expr>, … }` keyed by resolved parameter names, or `{}` when
   * the callee has no parameters. Bindings come from the shared resolver. Args without a binding are
   * validation errors already and are skipped here to keep the emission well-formed. */
  private actionRenderPropsBag(
    node: AST.ActionRender,
    actionDecl: AST.ActionDeclaration,
  ): Compiled {
    const args = node.argumentList?.arguments ?? []
    if (args.length === 0) {
      return compileNode(node)`{}`
    }
    const bindings = resolveArgumentBindings(actionDecl, node.argumentList).bindings
    return compileNode(node)`{
      ${
      compileIndentedNodeList(args, arg => {
        const param = bindings.get(arg)
        if (param === undefined) {
          return compileNoop()
        }
        return compileNode(arg)`
          ${parameterName(param)}: ${this.Expression(arg)},
        `
      })
    }
    }`
  }

  Declaration_state(declaration: AST.AssignmentDeclaration): Compiled {
    const name = this.scopedName(declaration)
    const value = this.assignmentDeclarationValue(declaration)
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
    const name = update.target.root.ref!.name
    const propertyPath = `[${update.target.properties.map(s => `'${s}'`).join(', ')}]`
    return compileNode(update)`
      _Scope.${name}.updateValue('${operator}', ${value}, ${propertyPath})
    `
  }

  // Views
  ////////

  ViewDeclaration(viewDeclaration: AST.ViewDeclaration): Compiled {
    const { block, name, parameterList } = viewDeclaration

    // TypeDeclarations are compile-time-only (no runtime binding); exclude them from scope emission.
    const declarations = this.streamAllDescendantsOf(block)
      .filterIs(AST.isRuntimeDeclaration)
      .toArray()

    const bindings = this.streamAllDescendantsOf(block)
      .filterIs(AST.isMemberAccessExpression)
      .map(ma => ma.root.ref)
      .filterIs(AST.isAssignmentDeclaration)
      .filter(decl => decl.type === 'state')
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

  // `TypeDeclaration`s are compile-time-only and don't participate in the runtime `_Scope`, so they're filtered out upstream.
  typeDeclarations(viewDeclaration: AST.ViewDeclaration, declarations: AST.RuntimeDeclaration[]): Compiled {
    return compileNode(viewDeclaration)`
      TR.Declare<typeof _Scope, {
        ${compileIndentedNodeList(declarations, declaration => this.typeDeclaration(declaration))}
      }>(_Scope)
    `
  }

  typeDeclaration(declaration: AST.RuntimeDeclaration): Compiled {
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
      if (!AST.isViewDeclaration(viewDecl)) {
        throwUnexpectedBehaviorError({
          humanMessage: 'ViewRender callee must resolve to a view declaration after validation.',
          cause: new Error('CodegenInvariantError'),
        })
      }
      const argumentList = this.viewRenderArgumentList(viewRender, viewDecl)
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

  /** scopedName emits `${declScope}.${name}` for a declaration, tracing the generated name token to its source node. */
  scopedName(node: AST.Declaration): Compiled {
    const name = compileNodeProperty(node, 'name')
    return compileNode(node)`${this.declScope}.${name}`
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

  /** viewRenderArgumentList emits JSX props for a `ViewRender`'s arguments using the resolver's bindings.
   * Each prop key is the resolved parameter name. Args without a binding (validation errors) are dropped
   * from emission to keep the JSX well-formed. */
  viewRenderArgumentList(viewRender: AST.ViewRender, viewDecl: AST.ViewDeclaration): Compiled {
    if (!viewRender.argumentList) {
      return compileNoop()
    }
    const args = viewRender.argumentList.arguments
    const bindings = resolveArgumentBindings(viewDecl, viewRender.argumentList).bindings
    return compileInlineNodeList(args, argument => {
      const resolvedParam = bindings.get(argument)
      if (resolvedParam === undefined) {
        return compileNoop()
      }
      return compileNode(argument)`
        ${parameterName(resolvedParam)}={${this.Expression(argument)}}
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
