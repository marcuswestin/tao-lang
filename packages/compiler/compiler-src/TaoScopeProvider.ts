import * as langium from 'langium'
import * as path from 'node:path'
import * as ast from './_gen-tao-parser/ast'

// TaoScopeProvider receives the global symbol index and filters `share`-marked declarations
// for `use` statement contexts; and filters `share`-marked and unmarked declarations for
// same-module contexts.
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  // Get the scope of available symbols for a given reference and its context.
  // E.g for `RecipeView { }`, the scope is the set of all non-`file` top level declarations in the same module,
  // plus all `use`-imported declarations.
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
    const currentDir = path.dirname(document.uri.path)

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
        // Get all workspace exported symbols of the target type AND within the target URI
        const allRelevantExports = this.indexManager
          .allElements(referenceType, new Set([targetUri]))

        for (const description of allRelevantExports) {
          if (useStmt.importedNames.includes(description.name)) {
            const node = description.node
            // Retrieve shared declarations:
            // Declaration nodes, wrapped in a VisibilityMarkedDeclaration, with 'share' visibility.
            if (!node) {
              continue
            } else if (!ast.isDeclaration(node) || !ast.isVisibilityMarkedDeclaration(node.$container)) {
              continue
            } else if (node.$container.visibility !== 'share') {
              continue
            } else {
              imported.push(description)
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
   *
   * Performance note: This queries all elements of the target type from the global index,
   * then filters by directory. For large workspaces, this could be optimized by:
   * - Caching a directory-to-URIs mapping
   * - Or only exporting same-module declarations to a module-scoped index
   * However, for typical Tao Lang projects (10-100 files), this is acceptable.
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
        const descDir = path.dirname(desc.documentUri.path)
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
   * Normalize and join path parts, removing trailing slashes for consistent comparison.
   * This ensures paths like `../` are normalized the same way as `dirname()` results.
   */
  private normalizeModulePath(...parts: string[]): string {
    return path.normalize(path.join(...parts)).replace(/\/+$/, '')
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
      const currentDir = path.dirname(document.uri.path)
      const targetPath = this.normalizeModulePath(currentDir, modulePath)
      const targetFileWithExt = targetPath + '.tao'

      const uris: string[] = []
      for (const doc of this.indexManager.allElements()) {
        const docPath = doc.documentUri.path
        const docDir = this.normalizeModulePath(path.dirname(docPath))

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
