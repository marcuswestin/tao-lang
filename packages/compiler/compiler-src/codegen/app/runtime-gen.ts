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
  compileTODO,
  CompositeGeneratorNode,
  refResolved,
} from '@compiler/codegen/codegen-util'
import { parameterName } from '@compiler/tao-type-shapes'
import { resolveArgumentBindings } from '@compiler/typing/tao-argument-bindings'
import { AST } from '@parser/parser'
import { Assert, Stream, switch_safe } from '@shared'
import { standardContainerDirection } from '@shared/layout/layout-axis'
import { throwUnexpectedBehaviorError } from '@shared/TaoErrors'
import { layoutEntryValues, serializeLayoutEntries } from '../../layout/tao-layout'
import {
  collectionSlugFromPlural,
  queryDeclarationAliasName,
} from '../../query/query-model'
import { decodeTaoTemplateTextChunk } from '../tao-template-text-chunk'
import type { TaoAppConfig, TaoAppConfigObject } from './app-config'
import { dataDeclarationToSerializedSchema } from './data-schema-serialization'
import { compileQueryDeclaration, compileQueryMemberAccessExpression } from './query-plan-gen'

type ViewRenderHost = AST.ViewRender | (AST.RenderStatement & { view: NonNullable<AST.RenderStatement['view']> })

/** TaoResolvedAppProvider is the provider selected for the compiled app after Tao source + compile overrides. */
export type TaoResolvedAppProvider = {
  name: string
  params: TaoAppConfigObject
}

/** TaoCodegenOpts toggles codegen behavior for harnesses (e.g. headless) without changing Tao source. */
export type TaoCodegenOpts = {
  /** Normalized app config after Tao source and compile overrides are merged. */
  app: TaoAppConfig
  /** Provider selected from the entry app and app overrides. Defaults to Memory. */
  appProvider: TaoResolvedAppProvider
}

/** TaoCodegenInputOpts are caller-provided app overrides before source defaults are resolved. */
export type TaoCodegenInputOpts = {
  /** App config overrides, e.g. `{ provider: { appId: "test-db" } }`. */
  app?: TaoAppConfigObject
}

export function compileTaoFile(taoFile: AST.TaoFile, codegenOpts?: TaoCodegenOpts): Compiled {
  const resolved: TaoCodegenOpts = codegenOpts ?? {
    app: { app: {} },
    appProvider: { name: 'Memory', params: {} },
  }
  return new RuntimeGen(resolved).TaoFile(taoFile)
}

class RuntimeGen {
  constructor(private readonly codegenOpts: TaoCodegenOpts) {}
  TODO(node: AST.Node): Compiled {
    return compileTODO(node)
  }

  TaoFile(taoFile: AST.TaoFile): Compiled {
    return compileNode(taoFile)`
      ${this.taoFileScope(taoFile)}
      ${compileNodeListProperty(taoFile, 'statements', wireUseStatement)}
      ${compileNodeListProperty(taoFile, 'statements', stmt => this.Statement(stmt))}
      ${this.taoFileDataProviderInits(taoFile)}
      ${this.taoFileAppInits(taoFile)}
    `

    function wireUseStatement(statement: AST.Statement): Compiled {
      if (!AST.isUseStatement(statement)) {
        return compileNoop()
      }
      const lines = statement.importedNames.map(name => `_Scope.${name} = ${name}`).join('\n')
      return compileNode(statement)`${lines}
`
    }
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
      RenderStatement: (n) => this.RenderStatement(n),
      ViewRender: (n) => this.ViewRender(n),
      ChildrenSplice: (n) => this.ChildrenSplice(n),
      ActionRender: (n) => this.ActionRender(n),
      TypeDeclaration: (n) => this.TypeDeclaration(n),
      DataDeclaration: (n) => this.dataDeclarationRuntime(n),
      QueryDeclaration: (n) => this.QueryDeclaration(n),
      GuardStatement: (n) => this.GuardStatement(n),
      ForStatement: (n) => this.ForStatement(n),
      CreateStatement: (n) => this.CreateStatement(n),
    })
  }

  Declaration(declaration: AST.Declaration): Compiled {
    return switch_safe.type(declaration, {
      AssignmentDeclaration: (n) => this.AssignmentDeclaration(n),
      AppDeclaration: (n) => this.AppDeclaration(n),
      ActionDeclaration: (n) => this.ActionDeclaration(n),
      ViewDeclaration: (n) => this.ViewDeclaration(n),
      TypeDeclaration: (n) => this.TypeDeclaration(n),
      DataDeclaration: (n) => this.dataDeclarationRuntime(n),
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
      BooleanLiteral: (node) => {
        return compileNode(node)`TR.Literal(${node.value === 'true' ? 'true' : 'false'})`
      },
      NullLiteral: (node) => {
        return compileNode(node)`TR.Literal(null)`
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
    })
  }

  /** MemberAccessExpression compiles `Name` or `Name.a.b.c` against the current scope. Bare names (empty path) resolve directly; chains wrap with `TR.MemberAccess`. */
  MemberAccessExpression(node: AST.MemberAccessExpression): Compiled {
    const root = node.root.ref
    if (root && AST.isQueryDeclaration(root)) {
      return compileQueryMemberAccessExpression(node, root)
    }
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
    const ui = declaration.appStatements.find(AST.isAppUiStatement)
    if (!ui) {
      return compileNoop()
    }
    const uiTarget = refResolved(ui.ui, 'AppUiStatement.ui')
    return compileNode(declaration)`
        function _AppUIView() {
          return <${uiTarget.name} />
        }; export const AppUIView = _AppUIView // TODO: Remove this
      `
  }

  ModuleDeclaration(moduleDecl: AST.ModuleDeclaration): Compiled {
    if (moduleDecl.visibility === 'share' && AST.isActionDeclaration(moduleDecl.declaration)) {
      const name = moduleDecl.declaration.name
      return compileNode(moduleDecl)`
        export const ${name} = ${this.actionLiteral(moduleDecl.declaration, name)}
      `
    }
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

  /** ActionRender compiles `do ActionName …` to `_Scope.ActionName.invoke({ … })`. */
  ActionRender(node: AST.ActionRender): Compiled {
    const actionDecl = refResolved(node.action, 'ActionRender.action')
    const propsBag = this.actionRenderPropsBag(node, actionDecl)
    const invoke = compileNode(node)`_Scope.${actionDecl.name}.invoke(${propsBag})`
    if (!isBlockWithStatements(node.block)) {
      return invoke
    }
    return compileNode(node)`
        ${invoke}
        ${this.Block(node.block)}
      `
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
    const name = refResolved(update.target.root, 'StateUpdate.target.root').name
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
      .map(ma => refResolved(ma.root, 'MemberAccessExpression.root'))
      .filterIs(AST.isAssignmentDeclaration)
      .filter(decl => decl.type === 'state')
      .unique()

    const queryStmts = block.statements.filter(AST.isQueryDeclaration)
    const guardStmt = block.statements.find(AST.isGuardStatement)
    const guardQueries = queryStmts
    const guardEarly = guardStmt
      ? this.viewGuardEarlyReturn(
        viewDeclaration,
        guardStmt,
        this.viewGuardLoadingExpr(viewDeclaration, guardQueries),
      )
      : compileNoop()

    const params = this.ViewParameterList(parameterList)
    const renderRoot = block.statements.find(AST.isRenderStatement)
    const renderedRoot = renderRoot === undefined
      ? compileNode(viewDeclaration)`null`
      : this.RenderStatement(renderRoot)

    return this.scoped(() =>
      compileNode(viewDeclaration)`
        const ${name} = TR.BlockScope(_Scope, (_Scope) => {
          return function ${name}_View(${params}) {
            ${this.typeDeclarations(viewDeclaration, declarations)}
            ${compileNodeList(declarations, declaration => this.Declaration(declaration))}
            ${compileNodeList(bindings, decl => this.reactiveBinding(decl))}
            ${compileNodeList(queryStmts, q => this.QueryDeclaration(q))}
            ${guardEarly}
            return ${renderedRoot}
          }
        })
      `
    )
  }

  /** viewFragmentStatement emits view-ordered JSX / `for` / debugger; skips hoisted declarations and statements handled elsewhere. */
  viewFragmentStatement(stmt: AST.Statement): Compiled {
    if (!AST.isViewFragmentStatement(stmt)) {
      return this.Statement(stmt)
    }
    return switch_safe.type(stmt, {
      RenderStatement: n => this.RenderStatement(n),
      ViewRender: n => this.renderNode(n),
      ChildrenSplice: n => this.renderNode(n),
      Injection: n => this.renderNode(n),
      ForStatement: n => this.ForStatement(n),
      Debugger: n => this.Debugger(n),
      QueryDeclaration: () => compileNoop(),
      GuardStatement: () => compileNoop(),
      TypeDeclaration: () => compileNoop(),
      DataDeclaration: () => compileNoop(),
      AppDeclaration: () => compileNoop(),
      AssignmentDeclaration: () => compileNoop(),
      ViewDeclaration: () => compileNoop(),
      ActionDeclaration: () => compileNoop(),
    })
  }

  /** ForStatement maps collection query data to keyed fragments with a per-iteration scope binding. */
  ForStatement(node: AST.ForStatement): Compiled {
    const coll = refResolved(node.collection, 'ForStatement.collection')
    Assert.is(
      coll,
      AST.isQueryDeclaration,
      'ForStatement collection must resolve to a query declaration after validation.',
      { collection: node.collection.$refText },
    )
    const alias = queryDeclarationAliasName(coll)
    const binding = node.name
    const inner = compileNodeList(node.block.statements, stmt => this.viewFragmentStatement(stmt))
    return compileNode(node)`
      {TR.ForEachQueryRow(_Scope, ${JSON.stringify(alias)}, ${JSON.stringify(binding)}, (_Scope) => (
        <>
          ${inner}
        </>
      ))}
    `
  }

  /** CreateStatement inserts a row via the active TaoDataClient provider. */
  CreateStatement(node: AST.CreateStatement): Compiled {
    const schema = refResolved(node.schema, 'CreateStatement.schema')
    const entity = refResolved(node.entity, 'CreateStatement.entity')
    const collection = collectionSlugFromPlural(entity.pluralName)
    const props = compileIndentedNodeList(node.fields, f => this.createFieldAssignment(f))
    return compileNode(node)`
      getTaoData(${JSON.stringify(schema.name)}).insert(${JSON.stringify(collection)}, {
        ${props}
      })
    `
  }

  /** createFieldAssignment emits one object property for `create { … }`. */
  private createFieldAssignment(field: AST.CreateFieldAssignment): Compiled {
    const key = JSON.stringify(field.field)
    if (field.value) {
      return compileNode(field)`${key}: ${this.Expression(field.value)},`
    }
    return compileNode(field)`${key}: _Scope.${field.field},`
  }

  /** viewGuardLoadingExpr emits query-result `isLoading` checks for in-view live queries used by `guard`. */
  private viewGuardLoadingExpr(anchor: AST.ViewDeclaration, queries: readonly AST.QueryDeclaration[]): Compiled {
    const aliases = [...new Set(queries.map(queryDeclarationAliasName).filter(Boolean))]
    if (aliases.length === 0) {
      return compileNode(anchor)`false`
    }
    const expr = aliases.map(n => `_Scope.${n}?.isLoading === true`).join(' || ')
    return compileNode(anchor)`${expr}`
  }

  /** viewGuardEarlyReturn emits a loading check and JSX fallback from `guard { … }`. */
  private viewGuardEarlyReturn(
    anchor: AST.ViewDeclaration,
    guard: AST.GuardStatement,
    loadingExpr: Compiled,
  ): Compiled {
    const parts = guard.block.statements.filter(s => AST.isViewRender(s) || AST.isInjection(s))
    const inner = compileNodeList(parts, x => this.renderNode(x as AST.ViewRender | AST.Injection))
    return compileNode(anchor)`
      if (${loadingExpr}) {
        return <>
          ${inner}
        </>
      }
    `
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
    ui: 'ViewState',
    frame: 'ViewState',
    layout: 'ViewState',
    app: '<unsupported in runtimeTypes>',
  } as const

  reactiveBinding(decl: AST.Referenceable): Compiled {
    return compileNode(decl)`_Scope.${decl.name}.useReactiveHandle()`
  }

  renderNode(renderNode: AST.RenderNode): Compiled {
    return switch_safe.type(renderNode, {
      RenderStatement: (stmt) => this.RenderStatement(stmt),
      ViewRender: (stmt) => this.ViewRender(stmt),
      ChildrenSplice: (stmt) => this.ChildrenSplice(stmt),
      Injection: (stmt) => compileNode(stmt)`{ ${this.Injection(stmt)} }`,
    })
  }

  /** ViewParameterList emits the view's properties destructuring with the implicit _taoScope prop. */
  ViewParameterList(_parameterList: AST.ParameterList | undefined): Compiled {
    return new CompositeGeneratorNode('_ViewProps: any')
  }

  RenderStatement(renderStatement: AST.RenderStatement): Compiled {
    if (renderStatement.injection !== undefined) {
      return this.Injection(renderStatement.injection)
    }
    if (renderStatement.view === undefined) {
      return compileNode(renderStatement)`null`
    }
    return this.viewRenderHost(renderStatement as ViewRenderHost, 'RenderStatement.view')
  }

  ViewRender(viewRender: AST.ViewRender): Compiled {
    return this.viewRenderHost(viewRender, 'ViewRender.view')
  }

  viewRenderHost(
    viewRender: ViewRenderHost,
    diagnosticLabel: string,
  ): Compiled {
    return compileNodePropertyRef(
      viewRender,
      'view',
      viewDecl => {
        Assert.is(
          viewDecl,
          AST.isViewDeclaration,
          'ViewRender callee must resolve to a view declaration after validation.',
          { callee: viewRender.view?.$refText },
        )
        const argumentList = this.viewRenderArgumentList(viewRender, viewDecl)
        const layoutProp = this.viewRenderLayoutSpec(viewRender, viewDecl)
        const childrenLayoutProp = this.viewRenderChildrenLayoutEntriesProp(viewRender, viewDecl)
        const scopeProp = this.viewScopeProp(viewDecl)
        if (!isBlockWithStatements(viewRender.block)) {
          return compileNode(viewRender)`
            <${viewDecl.name}${scopeProp} ${argumentList}${layoutProp}${childrenLayoutProp}/>
          `
        } else {
          return compileNode(viewRender)`
            <${viewDecl.name}${scopeProp} ${argumentList}${layoutProp}${childrenLayoutProp}>
              ${compileNodeList(viewRender.block.statements, stmt => this.viewRenderBlockStatement(stmt))}
            </${viewDecl.name}>
          `
        }
      },
      { requireResolved: true, diagnosticLabel },
    )
  }

  /** viewRenderLayoutSpec emits the serialized layout spec for the runtime layout resolver. */
  viewRenderLayoutSpec(viewRender: ViewRenderHost, viewDecl: AST.ViewDeclaration): Compiled {
    const selfEntries = this.viewRenderSelfLayoutEntries(viewRender, viewDecl)
    const routesChildrenLayout = renderHostDirectlyContainsChildrenSplice(viewRender)
    if (selfEntries.length === 0 && !routesChildrenLayout) {
      return compileNoop()
    }
    const spec = serializeLayoutEntries(viewDecl.name, selfEntries, {
      parentDirection: parentViewDirection(viewRender),
    })
    const callerChildrenLayout = compileNode(viewRender)`
      (_ViewProps._taoChildrenLayoutEntries === undefined
        ? {}
        : TR.Layout.resolve({ view: ${JSON.stringify(viewDecl.name)}, entries: _ViewProps._taoChildrenLayoutEntries }))
    `

    if (selfEntries.length === 0) {
      return compileNode(viewRender)`
        _taoLayout={_ViewProps._taoChildrenLayoutEntries === undefined
          ? undefined
          : TR.Layout.resolve({ view: ${
        JSON.stringify(viewDecl.name)
      }, entries: _ViewProps._taoChildrenLayoutEntries })}
      `.append(' ')
    }

    if (routesChildrenLayout) {
      return compileNode(viewRender.layoutClause ?? viewRender)`
        _taoLayout={{ ...TR.Layout.resolve(${JSON.stringify(spec)}), ...${callerChildrenLayout} }}
      `.append(' ')
    }

    return compileNode(viewRender.layoutClause ?? viewRender)`
      _taoLayout={TR.Layout.resolve(${JSON.stringify(spec)})}
    `.append(' ')
  }

  /** viewRenderChildrenLayoutEntriesProp passes caller container entries to a frame/layout's @@children host. */
  viewRenderChildrenLayoutEntriesProp(viewRender: ViewRenderHost, viewDecl: AST.ViewDeclaration): Compiled {
    if (viewRender.layoutClause === undefined || !viewDeclarationRoutesCallerContainerLayout(viewDecl)) {
      return compileNoop()
    }
    const entries = viewRender.layoutClause.entries.filter(isContainerLayoutEntry).map(entry =>
      layoutEntryValues(entry)
    )
    if (entries.length === 0) {
      return compileNoop()
    }
    return compileNode(viewRender.layoutClause)`
      _taoChildrenLayoutEntries={${JSON.stringify(entries)}}
    `.append(' ')
  }

  private viewRenderSelfLayoutEntries(
    viewRender: ViewRenderHost,
    viewDecl: AST.ViewDeclaration,
  ): readonly AST.LayoutEntry[] {
    const entries = viewRender.layoutClause?.entries ?? []
    if (!viewDeclarationRoutesCallerContainerLayout(viewDecl)) {
      return entries
    }
    return entries.filter(entry => !isContainerLayoutEntry(entry))
  }

  viewRenderBlockStatement(stmt: AST.Statement): Compiled {
    if (AST.isDeclaration(stmt)) {
      // Declarations are hoisted in views, so ignore it here
      return compileNoop()
    }
    if (AST.isRenderStatement(stmt)) {
      return this.RenderStatement(stmt)
    }
    if (AST.isViewRender(stmt)) {
      return this.renderNode(stmt)
    }
    if (AST.isChildrenSplice(stmt)) {
      return this.renderNode(stmt)
    }
    if (AST.isInjection(stmt)) {
      return compileNode(stmt)`{${this.Injection(stmt)}}`
    }
    if (AST.isForStatement(stmt)) {
      return this.ForStatement(stmt)
    }
    return this.Statement(stmt)
  }

  ChildrenSplice(node: AST.ChildrenSplice): Compiled {
    return compileNode(node)`{_ViewProps.children}`
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
  viewRenderArgumentList(viewRender: ViewRenderHost, viewDecl: AST.ViewDeclaration): Compiled {
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
    const trimmedTsCodeBlock = compileNodeProperty(injection, 'tsCodeBlock', stripTsFenceFromTsCodeBlock)
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

  /** GuardStatement only emits from `ViewDeclaration`; file-level guards are rejected by validation. */
  GuardStatement(_node: AST.GuardStatement): Compiled {
    return compileNoop()
  }

  /** QueryDeclaration binds `_Scope.<Alias>` via `useLiveQuery` in view hooks. File-level queries are deferred until after all providers open. */
  QueryDeclaration(node: AST.QueryDeclaration): Compiled {
    if (AST.isTaoFile(node.$container)) {
      return compileNoop()
    }
    return compileQueryDeclaration(node, expression => this.Expression(expression))
  }

  /** fileLevelQueryDeclaration binds `_Scope.<Alias>` from a non-reactive provider snapshot during app init. */
  private fileLevelQueryDeclaration(node: AST.QueryDeclaration): Compiled {
    return compileQueryDeclaration(node, expression => this.Expression(expression))
  }

  /** dataDeclarationRuntime creates the app-selected provider client and declares the dataset shape at module load. */
  dataDeclarationRuntime(decl: AST.DataDeclaration): Compiled {
    const schema = dataDeclarationToSerializedSchema(decl)

    return compileNode(decl)`
      setTaoData(${JSON.stringify(decl.name)}, createTaoDataClient(${
      JSON.stringify(this.codegenOpts.appProvider.name)
    }))
      getTaoData(${JSON.stringify(decl.name)}).declareDataset(${JSON.stringify(schema.shape)})
    `
  }

  /** taoFileDataProviderInits exports a bootstrap hook that opens this module's data providers. */
  taoFileDataProviderInits(taoFile: AST.TaoFile): Compiled {
    const openCalls = this.taoDataOpenCalls(taoFile)
    return compileNode(taoFile)`
      export function _taoOpenDataProviders() {
        ${openCalls.join('\n')}
      }
    `
  }

  /** taoFileAppInits exports a bootstrap hook that runs file-level queries and compiled `on init` handlers after every provider is open. */
  taoFileAppInits(taoFile: AST.TaoFile): Compiled {
    const queryInits = taoFile.statements.filter(AST.isQueryDeclaration)
    const onInits: AST.OnStatement[] = []
    for (const stmt of taoFile.statements) {
      if (AST.isModuleDeclaration(stmt) && AST.isAppDeclaration(stmt.declaration)) {
        this.collectOnInits(stmt.declaration, onInits)
      } else if (AST.isAppDeclaration(stmt)) {
        this.collectOnInits(stmt, onInits)
      }
    }
    return compileNode(taoFile)`
      export function _taoRunAppInits() {
        ${compileNodeList(queryInits, n => this.fileLevelQueryDeclaration(n))}
        ${compileNodeList(onInits, n => this.Block(n.handler.block))}
      }
    `
  }

  /** taoDataOpenCalls emits provider `open(...)` calls for every data block in this Tao module. */
  private taoDataOpenCalls(taoFile: AST.TaoFile): string[] {
    const calls: string[] = []
    const providerParams = runtimeProviderParams(this.codegenOpts.appProvider.params)
    for (const stmt of taoFile.statements) {
      const decl = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
      if (!AST.isDataDeclaration(decl)) {
        continue
      }
      const name = JSON.stringify(decl.name)
      calls.push(`getTaoData(${name}).open(${JSON.stringify(providerParams)})`)
    }
    return calls
  }

  /** collectOnInits gathers `on init` statements from an app declaration. */
  private collectOnInits(app: AST.AppDeclaration, out: AST.OnStatement[]): void {
    for (const st of app.appStatements) {
      if (AST.isOnStatement(st) && st.event === 'init') {
        out.push(st)
      }
    }
  }

  // Helper functions
  ///////////////////

  // AST Tree traversal

  private streamAllDescendantsOf(node: AST.Node): Stream<AST.Node> {
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

/** parentViewDirection returns the standard-container direction of the nearest render parent, when known. */
function parentViewDirection(node: ViewRenderHost): ReturnType<typeof standardContainerDirection> {
  let current: AST.Node | undefined = node.$container
  while (current !== undefined) {
    if (AST.isBlock(current)) {
      const owner = current.$container as AST.Node
      if (AST.isViewRender(owner) || AST.isRenderStatement(owner)) {
        return owner.view === undefined ? undefined : standardContainerDirection(owner.view.$refText)
      }
      current = owner
    } else {
      current = current.$container as AST.Node | undefined
    }
  }
  return undefined
}

function renderHostDirectlyContainsChildrenSplice(node: ViewRenderHost): boolean {
  return node.block?.statements.some(AST.isChildrenSplice) ?? false
}

function viewDeclarationRoutesCallerContainerLayout(decl: AST.ViewDeclaration): boolean {
  return decl.type !== 'ui' && viewDeclarationUsesChildrenSplice(decl)
}

function viewDeclarationUsesChildrenSplice(decl: AST.ViewDeclaration): boolean {
  const stack = [...decl.block.statements]
  while (stack.length > 0) {
    const stmt = stack.pop()!
    if (AST.isChildrenSplice(stmt)) {
      return true
    }
    if (AST.isDeclaration(stmt)) {
      continue
    }
    if (
      AST.isRenderStatement(stmt) || AST.isViewRender(stmt) || AST.isGuardStatement(stmt) || AST.isForStatement(stmt)
    ) {
      stack.push(...(stmt.block?.statements ?? []))
    }
  }
  return false
}

function isContainerLayoutEntry(entry: AST.LayoutEntry): boolean {
  const values = layoutEntryValues(entry)
  const head = values[0]
  return head === 'items' || head === 'gap'
}

/** stripTsFenceFromTsCodeBlock removes outer ```ts / ``` fences from an embedded TS code block for executable emit. */
function stripTsFenceFromTsCodeBlock(content: string): string {
  let s = content.trim()
  s = s.replace(/^```ts\s*\n?/im, '')
  s = s.replace(/\n?```\s*$/m, '')
  return s.trim()
}

/** runtimeProviderParams strips admin-only keys (secrets that must not appear in the client bundle) from provider config before embedding in generated app code. Add new admin-only keys here when introduced. */
function runtimeProviderParams(params: TaoAppConfigObject): TaoAppConfigObject {
  const adminOnlyKeys = new Set(['adminToken'])
  const runtimeParams: TaoAppConfigObject = {}
  for (const [key, value] of Object.entries(params)) {
    if (adminOnlyKeys.has(key)) {
      continue
    }
    runtimeParams[key] = value
  }
  return runtimeParams
}
