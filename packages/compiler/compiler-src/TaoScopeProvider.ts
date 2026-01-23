import * as langium from 'langium'
import * as path from 'node:path'
import * as ast from './_gen-tao-parser/ast'
import { normalizeModulePath } from './Paths'

// TaoScopeProvider filters symbols for reference resolution based on module visibility rules.
// It handles `share`-marked declarations for `use` imports and same-module symbol access.
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  // getScope returns the scope of available symbols for a reference context.
  // For view references, it applies module visibility rules (local -> imported -> same-module).
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

  // getModuleScopedDeclarations builds a scope chain: local -> imported -> same-module.
  // Local symbols shadow imported ones, which shadow same-module symbols.
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

  // getImportedSymbols collects symbols from `use` statements.
  // Only `share`-marked declarations can be imported from other modules.
  private getImportedSymbols(
    taoFile: ast.TaoFile,
    document: langium.LangiumDocument,
    context: langium.ReferenceInfo,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const imported: langium.AstNodeDescription[] = []

    const useStatements = taoFile.topLevelStatements.filter((stmt) => ast.isUseStatement(stmt))
    for (const useStmt of useStatements) {
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

  // getSameModuleSymbols collects symbols from files in the same directory (module).
  // Both default and `share` visibility declarations are visible within the same module.
  // Note: Queries all elements then filters by directory; acceptable for typical project sizes.
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

  // getLocalScope retrieves local symbols from the document's symbol table.
  // Walks up the AST container chain to find all symbols in enclosing scopes.
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

  // resolveModulePath converts a relative module path to document URIs.
  // Matches either an exact file (./ui/views.tao) or all files in a folder (./ui/).
  private resolveModulePath(
    modulePath: string,
    document: langium.LangiumDocument,
  ): string[] {
    if (!modulePath) {
      return []
    }

    try {
      const currentDir = path.dirname(document.uri.path)
      const targetPath = normalizeModulePath(currentDir, modulePath)
      const targetFileWithExt = targetPath + '.tao'

      const uris: string[] = []
      for (const doc of this.indexManager.allElements()) {
        const docPath = doc.documentUri.path
        const docDir = normalizeModulePath(path.dirname(docPath))

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
