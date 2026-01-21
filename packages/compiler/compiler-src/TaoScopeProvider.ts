import * as langium from 'langium'
import { dirname, join } from 'node:path'
import * as ast from './_gen-tao-parser/ast'

/**
 * TaoScopeProvider filters the global index based on module visibility rules.
 *
 * Visibility rules:
 * - Same module (folder): default + share declarations are visible
 * - Cross-module (via `use`): only `share` declarations can be imported
 * - `file` declarations: never visible outside their file (not in global index)
 */
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  /**
   * Get the scope for a reference. Filters by module visibility.
   */
  override getScope(context: langium.ReferenceInfo): langium.Scope {
    // For view references (like in ViewRenderStatement), apply module visibility rules
    if (context.property === 'view' && ast.isViewRenderStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    // For app ui references
    if (context.property === 'ui' && ast.isAppStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    return super.getScope(context)
  }

  /**
   * Get declarations visible based on module visibility rules.
   */
  private getModuleScopedDeclarations(context: langium.ReferenceInfo): langium.Scope {
    const document = langium.AstUtils.getDocument(context.container)
    const taoFile = document.parseResult.value as ast.TaoFile
    const currentDir = dirname(document.uri.path)

    // 1. Collect explicitly imported names via `use` statements
    const importedSymbols = this.getImportedSymbols(taoFile, document, context)

    // 2. Collect same-module symbols (default + share visibility)
    const sameModuleSymbols = this.getSameModuleSymbols(currentDir, context)

    // 3. Get local file symbols from document's local symbol table
    const localScope = this.getLocalScope(context, document)

    // Build scope chain: local -> imported -> same-module
    // Local symbols shadow imported, imported shadow same-module
    const sameModuleScope = this.createScope(sameModuleSymbols)
    const importedScope = this.createScope(importedSymbols, sameModuleScope)
    return this.createScope(localScope, importedScope)
  }

  /**
   * Get symbols imported via `use` statements.
   * Only `share` declarations can be imported from other modules.
   */
  private getImportedSymbols(
    taoFile: ast.TaoFile,
    document: langium.LangiumDocument,
    context: langium.ReferenceInfo,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const imported: langium.AstNodeDescription[] = []

    for (const useStmt of taoFile.useStatements) {
      const targetUris = this.resolveModulePath(useStmt.modulePath, document)

      for (const targetUri of targetUris) {
        // Get all exported symbols from target URI
        const exports = this.indexManager
          .allElements(referenceType, new Set([targetUri]))
          .toArray()

        // Filter to only include symbols that were explicitly imported by name
        // AND have `share` visibility
        for (const desc of exports) {
          if (useStmt.importedNames.includes(desc.name)) {
            // Check visibility - only share can be imported cross-module
            const node = desc.node
            if (node && ast.isDeclaration(node) && node.visibility === 'share') {
              imported.push(desc)
            }
          }
        }
      }
    }

    return imported
  }

  /**
   * Get symbols from the same module (folder).
   * Both default and share visibility are visible within the same module.
   */
  private getSameModuleSymbols(
    currentDir: string,
    context: langium.ReferenceInfo,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const currentDocument = langium.AstUtils.getDocument(context.container)

    return this.indexManager
      .allElements(referenceType)
      .filter((desc) => {
        const descDir = dirname(desc.documentUri.path)
        // Same module = same directory, but exclude current file (handled by local scope)
        return descDir === currentDir && desc.documentUri.toString() !== currentDocument.uri.toString()
      })
      .toArray()
  }

  /**
   * Get local symbols from the document's local symbol table (declarations in the same file).
   */
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

  /**
   * Resolve a module path to document URIs.
   * - `./ui/views` can match `/project/ui/views.tao` (file) or all .tao files in `/project/ui/views/` (folder)
   */
  private resolveModulePath(
    modulePath: string,
    document: langium.LangiumDocument,
  ): string[] {
    if (!modulePath) {
      return []
    }

    try {
      const currentDir = dirname(document.uri.path)
      const targetPath = join(currentDir, modulePath)
      const targetFileWithExt = targetPath + '.tao'

      const uris: string[] = []
      for (const doc of this.indexManager.allElements()) {
        const docPath = doc.documentUri.path
        const docDir = dirname(docPath)

        // Match exact file (e.g., ./ui/views -> /project/ui/views.tao)
        if (docPath === targetFileWithExt) {
          uris.push(doc.documentUri.toString())
        } // Match folder (e.g., ./ui -> all files in /project/ui/)
        else if (docDir === targetPath) {
          uris.push(doc.documentUri.toString())
        }
      }

      return [...new Set(uris)] // Deduplicate
    } catch {
      return []
    }
  }
}
