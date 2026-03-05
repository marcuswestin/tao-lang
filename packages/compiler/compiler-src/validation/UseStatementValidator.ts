import * as langium from 'langium'
import * as path from 'node:path'
import { TAO_EXT } from '../@shared/TaoPaths'
import * as ast from '../_gen-tao-parser/ast'
import { normalizeModulePath } from '../Paths'

// UseStatementValidator validates that imported names in use statements exist
// and have appropriate visibility for the import context.
// Same-module imports (`use Foo`) accept default + share; cross-module requires `share`.
export class UseStatementValidator {
  constructor(
    private readonly indexManager: langium.IndexManager,
    private readonly documents: langium.LangiumDocuments,
  ) {}

  // checkUseStatement validates a use statement's imported names against the target module.
  checkUseStatement(
    useStatement: ast.UseStatement,
    accept: langium.ValidationAcceptor,
  ): void {
    const document = langium.AstUtils.getDocument(useStatement)

    // Skip validation for non-file URIs (e.g., tao-string:// used in single-file parsing tests)
    if (document.uri.scheme !== 'file') {
      return
    }

    const sameModule = this.isSameModuleImport(useStatement, document)
    const targetUris = sameModule
      ? this.getSameModuleUris(document)
      : this.resolveModulePath(useStatement.modulePath!, document)

    if (targetUris.length === 0 && !sameModule) {
      accept('error', `Cannot resolve module path '${useStatement.modulePath}'`, {
        node: useStatement,
        property: 'modulePath',
      })
      return
    }

    if (sameModule) {
      this.validateSameModuleImports(useStatement, targetUris, accept)
    } else {
      this.validateCrossModuleImports(useStatement, targetUris, accept)
    }
  }

  // validateSameModuleImports checks that imported names exist in the same module.
  // Default and `share` are accessible; `file` is not.
  private validateSameModuleImports(
    useStatement: ast.UseStatement,
    targetUris: string[],
    accept: langium.ValidationAcceptor,
  ): void {
    const accessibleNames = new Set(this.getAccessibleSameModuleDeclarations(targetUris).map(d => d.name))

    for (let i = 0; i < useStatement.importedNames.length; i++) {
      const importedName = useStatement.importedNames[i]

      if (!accessibleNames.has(importedName)) {
        if (this.isFilePrivateDeclaration(importedName, targetUris)) {
          accept('error', `'${importedName}' is marked as 'file' and cannot be accessed from other files.`, {
            node: useStatement,
            property: 'importedNames',
            index: i,
          })
        } else {
          accept('error', `'${importedName}' is not declared in this module.`, {
            node: useStatement,
            property: 'importedNames',
            index: i,
          })
        }
      }
    }
  }

  // validateCrossModuleImports checks that imported names are `share`-marked in the target module.
  private validateCrossModuleImports(
    useStatement: ast.UseStatement,
    targetUris: string[],
    accept: langium.ValidationAcceptor,
  ): void {
    const shareNames = new Set(this.getShareDeclarations(targetUris).map(d => d.name))

    for (let i = 0; i < useStatement.importedNames.length; i++) {
      const importedName = useStatement.importedNames[i]

      if (!shareNames.has(importedName)) {
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

  // isSameModuleImport returns true when a `use` statement targets the same module.
  private isSameModuleImport(useStatement: ast.UseStatement, document: langium.LangiumDocument): boolean {
    if (!useStatement.modulePath) {
      return true
    }
    const currentDir = path.dirname(document.uri.path)
    const targetPath = normalizeModulePath(currentDir, useStatement.modulePath)
    return targetPath === normalizeModulePath(currentDir)
  }

  // getSameModuleUris returns document URIs for all files in the same directory, excluding current file.
  private getSameModuleUris(document: langium.LangiumDocument): string[] {
    const currentDir = normalizeModulePath(path.dirname(document.uri.path))
    const uris: string[] = []
    for (const doc of this.documents.all) {
      const docDir = normalizeModulePath(path.dirname(doc.uri.path))
      if (docDir === currentDir && doc.uri.toString() !== document.uri.toString()) {
        uris.push(doc.uri.toString())
      }
    }
    return [...new Set(uris)]
  }

  // getAccessibleSameModuleDeclarations returns all indexed declarations from same-module URIs.
  // File-private declarations are already excluded by ScopeComputation.
  private getAccessibleSameModuleDeclarations(targetUris: string[]): langium.AstNodeDescription[] {
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
      results.push(desc)
    }

    return results
  }

  // isFilePrivateDeclaration checks AST directly for `file`-marked declarations (not in index).
  private isFilePrivateDeclaration(name: string, targetUris: string[]): boolean {
    const uriSet = new Set(targetUris)
    for (const doc of this.documents.all) {
      if (!uriSet.has(doc.uri.toString())) {
        continue
      }
      const taoFile = doc.parseResult.value as ast.TaoFile
      for (const stmt of taoFile.topLevelStatements) {
        if (ast.isVisibilityMarkedDeclaration(stmt) && stmt.visibility === 'file') {
          if (stmt.declaration.name === name) {
            return true
          }
        }
      }
    }
    return false
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

      const container = node.$container
      if (!ast.isVisibilityMarkedDeclaration(container) || container.visibility !== 'share') {
        return true
      }
    }

    return false
  }

  // resolveModulePath resolves a relative module path to document URIs.
  private resolveModulePath(modulePath: string, document: langium.LangiumDocument): string[] {
    if (!modulePath) {
      return []
    }

    try {
      const currentDir = path.dirname(document.uri.path)
      const targetPath = normalizeModulePath(currentDir, modulePath)
      const targetFileWithExt = targetPath + TAO_EXT

      const uris: string[] = []
      for (const doc of this.documents.all) {
        const docPath = doc.uri.path
        const docDir = normalizeModulePath(path.dirname(docPath))

        if (docPath === targetFileWithExt) {
          uris.push(doc.uri.toString())
        } else if (docDir === targetPath) {
          uris.push(doc.uri.toString())
        }
      }

      return [...new Set(uris)]
    } catch {
      return []
    }
  }
}
