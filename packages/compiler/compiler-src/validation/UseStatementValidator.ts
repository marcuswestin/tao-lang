import * as langium from 'langium'
import * as path from 'node:path'
import * as ast from '../_gen-tao-parser/ast'
import { normalizeModulePath } from '../Paths'

// UseStatementValidator validates that imported names in use statements exist
// and are marked as 'share' declarations in the target module.
export class UseStatementValidator {
  private readonly indexManager: langium.IndexManager
  private readonly documents: langium.LangiumDocuments

  constructor(services: langium.LangiumCoreServices) {
    this.indexManager = services.shared.workspace.IndexManager
    this.documents = services.shared.workspace.LangiumDocuments
  }

  // checkUseStatement validates a use statement's imported names against the target module.
  checkUseStatement(
    useStatement: ast.UseStatement,
    accept: langium.ValidationAcceptor,
  ): void {
    const document = langium.AstUtils.getDocument(useStatement)

    // Skip validation for non-file URIs (e.g., tao-string:// used in single-file parsing tests)
    // These tests are for syntax validation only and don't have multi-file context
    if (document.uri.scheme !== 'file') {
      return
    }

    const targetUris = this.resolveModulePath(useStatement.modulePath, document)

    if (targetUris.length === 0) {
      accept('error', `Cannot resolve module path '${useStatement.modulePath}'`, {
        node: useStatement,
        property: 'modulePath',
      })
      return
    }

    // Get all 'share' declarations from target module(s)
    const shareDeclarations = this.getShareDeclarations(targetUris)
    const shareNames = new Set(shareDeclarations.map(d => d.name))

    // Check each imported name
    for (let i = 0; i < useStatement.importedNames.length; i++) {
      const importedName = useStatement.importedNames[i]

      if (!shareNames.has(importedName)) {
        // Check if the declaration exists but isn't shared
        const existsButNotShared = this.declarationExistsButNotShared(importedName, targetUris)

        if (existsButNotShared) {
          accept(
            'error',
            `'${importedName}' must be marked with 'share' to be used from here (outside of its module).`,
            {
              node: useStatement,
              property: 'importedNames',
              index: i,
            },
          )
        } else {
          accept('error', `'${importedName}' is not exported from '${useStatement.modulePath}'`, {
            node: useStatement,
            property: 'importedNames',
            index: i,
          })
        }
      }
    }
  }

  // getShareDeclarations returns all declarations marked with 'share' from the given URIs.
  private getShareDeclarations(targetUris: string[]): langium.AstNodeDescription[] {
    const uriSet = new Set(targetUris)
    const results: langium.AstNodeDescription[] = []

    for (const desc of this.indexManager.allElements()) {
      if (!uriSet.has(desc.documentUri.toString())) {
        continue
      }

      const node = desc.node
      if (!node || !ast.isDeclaration(node)) {
        continue
      }

      // Check if wrapped in VisibilityMarkedDeclaration with 'share'
      const container = node.$container
      if (ast.isVisibilityMarkedDeclaration(container) && container.visibility === 'share') {
        results.push(desc)
      }
    }

    return results
  }

  // declarationExistsButNotShared checks if a declaration exists but isn't marked with 'share'.
  private declarationExistsButNotShared(name: string, targetUris: string[]): boolean {
    const uriSet = new Set(targetUris)

    for (const desc of this.indexManager.allElements()) {
      if (!uriSet.has(desc.documentUri.toString())) {
        continue
      }

      if (desc.name !== name) {
        continue
      }

      const node = desc.node
      if (!node || !ast.isDeclaration(node)) {
        continue
      }

      // Found a declaration with this name - check if it's not shared
      const container = node.$container
      if (!ast.isVisibilityMarkedDeclaration(container) || container.visibility !== 'share') {
        return true // Exists but not shared
      }
    }

    return false
  }

  // resolveModulePath resolves a relative module path to document URIs.
  // Uses LangiumDocuments to find all documents, including those with only file-private declarations.
  private resolveModulePath(modulePath: string, document: langium.LangiumDocument): string[] {
    if (!modulePath) {
      return []
    }

    try {
      const currentDir = path.dirname(document.uri.path)
      const targetPath = normalizeModulePath(currentDir, modulePath)
      const targetFileWithExt = targetPath + '.tao'

      const uris: string[] = []
      for (const doc of this.documents.all) {
        const docPath = doc.uri.path
        const docDir = normalizeModulePath(path.dirname(docPath))

        // Match exact file (e.g., ./ui/views -> /project/ui/views.tao)
        if (docPath === targetFileWithExt) {
          uris.push(doc.uri.toString())
        } // Match folder (e.g., ./ui -> all files in /project/ui/)
        else if (docDir === targetPath) {
          uris.push(doc.uri.toString())
        }
      }

      return [...new Set(uris)] // Deduplicate
    } catch {
      return []
    }
  }
}
