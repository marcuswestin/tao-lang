import { AST, LGM } from '@parser'
import { LGM as langium } from '@parser'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
} from '../resolution/ModuleResolution'

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
    if (context.property === 'view' && AST.isViewRender(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    if (context.property === 'ui' && AST.isAppStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    if (context.property === 'referenceName' && AST.isNamedReference(context.container)) {
      const document = langium.AstUtils.getDocument(context.container)
      return this.createScope(this.getLocalScope(context, document))
    }

    return super.getScope(context)
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
