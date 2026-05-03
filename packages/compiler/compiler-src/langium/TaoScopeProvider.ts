import { AST, LGM } from '@parser'
import { LGM as langium } from '@parser'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
} from '../resolution/ModuleResolution'
import { createSyntheticTypeDeclaration, getSyntheticTypeDeclaration } from '../tao-type-shapes'
import type { CalleeDeclaration } from '../typing/tao-argument-bindings'
import { isCallableDeclaration } from '../typing/tao-argument-bindings'
import { findEnclosingArgumentContext } from '../typing/tao-local-parameter-types'

/** moduleScopedRefRules lists reference `property` keys whose callee/type ref is resolved from the module
 * plus `use` imports (same pattern as `getModuleScopedDeclarations`). */
const moduleScopedRefRules: readonly {
  readonly property: string
  readonly isContainer: (node: AST.Node) => boolean
}[] = [
  { property: 'view', isContainer: AST.isViewRender },
  { property: 'action', isContainer: AST.isActionRender },
  { property: 'ui', isContainer: AST.isAppUiStatement },
  { property: 'ref', isContainer: AST.isNamedTypeRef },
  { property: 'namedRef', isContainer: AST.isDataFieldType },
  { property: 'arrayRef', isContainer: AST.isDataFieldType },
]

/** TaoScopeProvider resolves reference scopes using module and use-statement rules. */
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  constructor(
    services: langium.LangiumCoreServices,
    private readonly stdLibRoot: string | undefined,
  ) {
    super(services)
  }

  /** getScope returns available symbols for the given reference context. */
  override getScope(context: langium.ReferenceInfo): langium.Scope {
    const container = context.container as AST.Node
    for (const rule of moduleScopedRefRules) {
      if (context.property === rule.property && rule.isContainer(container)) {
        if (context.property === 'ref' && AST.isNamedTypeRef(container)) {
          return this.getNamedTypeRefScope(context, container)
        }
        return this.getModuleScopedDeclarations(context)
      }
    }

    if (context.property === 'root' && AST.isMemberAccessExpression(context.container)) {
      const document = langium.AstUtils.getDocument(context.container)
      return this.createScope(this.getLocalScope(context, document))
    }

    if (context.property === 'entity' && AST.isQueryDeclaration(context.container)) {
      return this.getDataSchemaEntityScope(context)
    }

    if (context.property === 'entity' && AST.isCreateStatement(context.container)) {
      return this.getDataSchemaEntityScope(context)
    }

    return super.getScope(context)
  }

  /** getNamedTypeRefScope handles NamedTypeRef resolution with support for local parameter types.
   * - For bare names in argument context: adds callee-local parameter synthetic TypeDeclarations to scope.
   * - For qualified names (`Badge.Title`): adds callable-owner synthetic TypeDeclarations so `Badge` resolves. */
  private getNamedTypeRefScope(context: langium.ReferenceInfo, namedRef: AST.NamedTypeRef): langium.Scope {
    const baseScope = this.getModuleScopedDeclarations(context)
    const typedLiteral = namedRef.$container
    if (!AST.isTypedLiteralExpression(typedLiteral)) {
      return baseScope
    }

    let document: langium.LangiumDocument
    try {
      document = langium.AstUtils.getDocument(namedRef)
    } catch {
      return baseScope
    }

    const extraDescriptions: AST.NodeDescription[] = []

    if (namedRef.segments.length > 0) {
      this.addCallableOwnerDescriptions(document, extraDescriptions)
    }

    const argCtx = findEnclosingArgumentContext(typedLiteral)
    if (argCtx && namedRef.segments.length === 0) {
      this.addCalleeLocalTypeDescriptions(argCtx.callee, document, extraDescriptions)
    }

    if (extraDescriptions.length === 0) {
      return baseScope
    }
    return this.createScope(extraDescriptions, baseScope)
  }

  /** addCallableOwnerDescriptions adds synthetic TypeDeclaration descriptions for callable declarations
   * (views and actions) that own local parameter types, so that `Badge` in `Badge.Title` can resolve via NamedTypeRef.ref. */
  private addCallableOwnerDescriptions(
    document: langium.LangiumDocument,
    out: AST.NodeDescription[],
  ): void {
    const taoFile = document.parseResult.value
    if (!AST.isTaoFile(taoFile)) {
      return
    }
    for (const stmt of taoFile.statements) {
      const decl = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
      if (!isCallableDeclaration(decl)) {
        continue
      }
      const hasLocalTypes = decl.parameterList?.parameters.some(p => p.localSuperType) ?? false
      if (!hasLocalTypes) {
        continue
      }
      const synth = this.getCallableOwnerSyntheticType(decl)
      if (synth) {
        out.push(this.descriptions.createDescription(synth, decl.name, document))
      }
    }
  }

  /** addCalleeLocalTypeDescriptions adds synthetic TypeDeclaration descriptions for a callee's local
   * parameter types so that unqualified constructor heads resolve in argument context. */
  private addCalleeLocalTypeDescriptions(
    callee: AST.ViewDeclaration | AST.ActionDeclaration,
    document: langium.LangiumDocument,
    out: AST.NodeDescription[],
  ): void {
    const params = callee.parameterList?.parameters ?? []
    for (const p of params) {
      if (!p.localSuperType) {
        continue
      }
      const synth = getSyntheticTypeDeclaration(p)
      if (synth) {
        out.push(this.descriptions.createDescription(synth, p.name, document))
      }
    }
  }

  private callableOwnerSyntheticTypes = new WeakMap<CalleeDeclaration, AST.TypeDeclaration>()

  /** getCallableOwnerSyntheticType returns a stable synthetic TypeDeclaration for a callable declaration
   * (view or action) that owns local parameter types. Used so that `Badge` in `Badge.Title` can resolve
   * via NamedTypeRef.ref. Owner synthetics are path owners for qualified lookup only — their `base` must
   * not affect local type fingerprinting. */
  private getCallableOwnerSyntheticType(callable: CalleeDeclaration): AST.TypeDeclaration | undefined {
    const cached = this.callableOwnerSyntheticTypes.get(callable)
    if (cached) {
      return cached
    }

    const firstLocalParam = callable.parameterList?.parameters.find(p => p.localSuperType)
    if (!firstLocalParam?.localSuperType) {
      return undefined
    }

    const synthetic = createSyntheticTypeDeclaration({
      name: callable.name,
      base: firstLocalParam.localSuperType as AST.TypeExpression,
      container: callable.$container,
      cstNode: callable.$cstNode,
      anchorNode: callable,
    })

    this.callableOwnerSyntheticTypes.set(callable, synthetic)
    return synthetic
  }

  /** getDataSchemaEntityScope limits `query` / `create` entity links to entities declared on the referenced `data` schema. */
  private getDataSchemaEntityScope(context: langium.ReferenceInfo): langium.Scope {
    const stmt = context.container
    if (!AST.isQueryDeclaration(stmt) && !AST.isCreateStatement(stmt)) {
      return this.createScope([])
    }
    const schema = stmt.schema.ref
    if (!schema || !AST.isDataDeclaration(schema)) {
      return this.createScope([])
    }
    let document: langium.LangiumDocument
    try {
      document = langium.AstUtils.getDocument(schema)
    } catch {
      return this.createScope([])
    }
    const descs = schema.dataStatements
      .filter(AST.isDataEntityDeclaration)
      .map(e => this.descriptions.createDescription(e, e.name, document))
    return this.createScope(descs)
  }

  /** getModuleScopedDeclarations merges local symbols with use-imported symbols. */
  private getModuleScopedDeclarations(context: langium.ReferenceInfo): langium.Scope {
    const document = AST.Utils.getDocument(context.container) as AST.Document
    const value = document.parseResult.value
    if (!AST.isTaoFile(value)) {
      return this.createScope([])
    }
    const taoFileNode = value
    const useImportedSymbols = this.getUseImportedSymbols(taoFileNode, document, context)
    const localScope = this.getLocalScope(context, document)

    const importedScope = this.createScope(useImportedSymbols)
    return this.createScope(localScope, importedScope)
  }

  /** getUseImportedSymbols returns descriptions for names imported via use statements. */
  private getUseImportedSymbols(
    taoFile: AST.TaoFile,
    document: AST.Document,
    context: LGM.ReferenceInfo,
  ): AST.NodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const imported: AST.NodeDescription[] = []

    const useStatements = taoFile.statements.filter((stmt) => AST.isUseStatement(stmt))

    for (const useStmt of useStatements) {
      const imports = this.getSymbolsForUseStatement(useStmt, referenceType, document)
      imported.push(...imports.toArray())
    }

    return imported
  }

  /** getSymbolsForUseStatement returns a stream of symbols visible from one use statement. */
  private getSymbolsForUseStatement(
    useStmt: AST.UseStatement,
    referenceType: string,
    document: AST.Document,
  ): langium.Stream<AST.NodeDescription> {
    const sameModule = isSameModuleImport(useStmt, document.uri.path)
    const indexUrisAndPaths = Array.from(this.indexManager.allElements(), (desc) => ({
      uri: desc.documentUri.toString(),
      path: desc.documentUri.path,
    }))
    const targetUris = sameModule
      ? getSameModuleUris(document.uri.path, document.uri.toString(), indexUrisAndPaths)
      : resolveModulePathToUris(
        useStmt.modulePath!,
        document.uri.path,
        this.stdLibRoot,
        indexUrisAndPaths,
      )

    return this.getAccessibleImportedSymbols(targetUris, referenceType, useStmt, sameModule)
  }

  /** getAccessibleImportedSymbols filters index elements by URI set and import rules. */
  private getAccessibleImportedSymbols(
    targetUris: string[],
    referenceType: string,
    useStmt: AST.UseStatement,
    sameModule: boolean,
  ): langium.Stream<AST.NodeDescription> {
    return this.indexManager.allElements(referenceType, new Set(targetUris))
      .filter((description) => this.isImportAccessible(description, useStmt, sameModule))
  }

  /** isImportAccessible returns whether the description matches the useStmt import list and share rules. */
  private isImportAccessible(
    description: AST.NodeDescription,
    useStmt: AST.UseStatement,
    sameModule: boolean,
  ): boolean {
    if (!useStmt.importedNames.includes(description.name)) {
      return false
    }
    const node = description.node
    if (!node) {
      return false
    }
    if (sameModule) {
      return true
    }
    // Cross-module: only `share`-marked declarations
    if (AST.isDeclaration(node) && AST.isSharedModuleDeclaration(node.$container)) {
      return true
    }
    return false
  }

  /** getLocalScope collects local symbol descriptions walking up from context.container. */
  private getLocalScope(
    context: langium.ReferenceInfo,
    document: langium.LangiumDocument,
  ): AST.NodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const localSymbols = document.localSymbols
    if (!localSymbols) {
      return []
    }

    const locals: AST.NodeDescription[] = []
    let current: AST.Node | undefined = context.container
    while (current) {
      if (localSymbols.has(current)) {
        for (const desc of localSymbols.getStream(current)) {
          if (this.reflection.isSubtype(desc.type, referenceType)) {
            locals.push(desc)
          }
        }
      }
      current = current.$container
    }

    return locals
  }
}
