import * as ast from '@parser/ast'
import * as langium from 'langium'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
} from './ModuleResolution'

// TaoScopeProvider filters symbols for reference resolution based on module visibility rules.
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  constructor(
    services: langium.LangiumCoreServices,
    private readonly stdLibRoot: string | undefined,
  ) {
    super(services)
  }

  // getScope returns the scope of available symbols for a reference context.
  override getScope(context: langium.ReferenceInfo): langium.Scope {
    if (context.property === 'view' && ast.isViewRenderStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    if (context.property === 'ui' && ast.isAppStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    if (context.property === 'referenceName' && ast.isNamedReference(context.container)) {
      const document = langium.AstUtils.getDocument(context.container)
      return this.createScope(this.getLocalScope(context, document))
    }

    return super.getScope(context)
  }

  // getModuleScopedDeclarations builds a scope chain: local -> imported.
  private getModuleScopedDeclarations(context: langium.ReferenceInfo): langium.Scope {
    const document = langium.AstUtils.getDocument(context.container)
    const taoFileNode = document.parseResult.value as ast.TaoFile

    const useImportedSymbols = this.getUseImportedSymbols(taoFileNode, document, context)
    const localScope = this.getLocalScope(context, document)

    const importedScope = this.createScope(useImportedSymbols)
    return this.createScope(localScope, importedScope)
  }

  // getUseImportedSymbols collects symbols from `use` statements.
  private getUseImportedSymbols(
    taoFile: ast.TaoFile,
    document: langium.LangiumDocument,
    context: langium.ReferenceInfo,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const imported: langium.AstNodeDescription[] = []

    const useStatements = taoFile.topLevelStatements.filter((stmt) => ast.isUseStatement(stmt))

    for (const useStmt of useStatements) {
      const imports = this.getSymbolsForUseStatement(useStmt, referenceType, document)
      imported.push(...imports.toArray())
    }

    return imported
  }

  // getSymbolsForUseStatement resolves symbols for a `use` statement.
  private getSymbolsForUseStatement(
    useStmt: ast.UseStatement,
    referenceType: string,
    document: langium.LangiumDocument,
  ): langium.Stream<langium.AstNodeDescription> {
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

  private getAccessibleImportedSymbols(
    targetUris: string[],
    referenceType: string,
    useStmt: ast.UseStatement,
    sameModule: boolean,
  ): langium.Stream<langium.AstNodeDescription> {
    return this.indexManager.allElements(referenceType, new Set(targetUris))
      .filter((description) => this.isImportAccessible(description, useStmt, sameModule))
  }

  // isImportAccessible checks whether an exported symbol matches an imported name and has appropriate visibility.
  private isImportAccessible(
    description: langium.AstNodeDescription,
    useStmt: ast.UseStatement,
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
    if (ast.isImportableDeclaration(node) && ast.isTopLevelDeclaration(node.$container)) {
      return node.$container.visibility === 'share'
    }
    return false
  }

  // getLocalScope retrieves local symbols from the document's symbol table.
  private getLocalScope(
    context: langium.ReferenceInfo,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const localSymbols = document.localSymbols
    if (!localSymbols) {
      return []
    }

    const locals: langium.AstNodeDescription[] = []
    let current: langium.AstNode | undefined = context.container
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
