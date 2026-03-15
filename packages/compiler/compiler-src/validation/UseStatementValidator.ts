import * as ast from '@parser/ast'
import * as langium from 'langium'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
  type UriAndPath,
} from '../ModuleResolution'
import { isStdLibImport } from '../StdLibPaths'

// UseStatementValidator validates that imported names in use statements exist
// and have appropriate visibility for the import context.
// Same-module imports (`use Foo`) accept default + share; cross-module requires `share`.
export class UseStatementValidator {
  constructor(
    private readonly indexManager: langium.IndexManager,
    private readonly documents: langium.LangiumDocuments,
    private readonly stdLibRoot?: string,
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

    if (useStatement.modulePath && isStdLibImport(useStatement.modulePath) && !this.stdLibRoot) {
      accept('error', 'Standard library root is not configured; cannot resolve tao/... imports.', {
        node: useStatement,
        property: 'modulePath',
      })
      return
    }

    const { targetUris, sameModule } = this.getTargetUrisForUseStatement(useStatement, document)

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

  // getDocUrisAndPaths returns URI and path pairs for all documents in the workspace.
  private getDocUrisAndPaths(): UriAndPath[] {
    return Array.from(this.documents.all, (doc) => ({
      uri: doc.uri.toString(),
      path: doc.uri.path,
    }))
  }

  // getTargetUrisForUseStatement resolves a use statement to the target document URIs and whether it is same-module.
  private getTargetUrisForUseStatement(
    useStatement: ast.UseStatement,
    document: langium.LangiumDocument,
  ): { targetUris: string[]; sameModule: boolean } {
    const docUrisAndPaths = this.getDocUrisAndPaths()
    const sameModule = isSameModuleImport(useStatement, document.uri.path)
    const targetUris = sameModule
      ? getSameModuleUris(document.uri.path, document.uri.toString(), docUrisAndPaths)
      : resolveModulePathToUris(
        useStatement.modulePath!,
        document.uri.path,
        this.stdLibRoot,
        docUrisAndPaths,
      )
    return { targetUris, sameModule }
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
      if (!node || !ast.isImportableDeclaration(node)) {
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
        if (ast.isTopLevelDeclaration(stmt) && stmt.visibility === 'file') {
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
      if (!node || !ast.isImportableDeclaration(node)) {
        continue
      }

      const container = node.$container
      if (ast.isTopLevelDeclaration(container) && container.visibility === 'share') {
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
      if (!node || !ast.isImportableDeclaration(node)) {
        continue
      }

      const container = node.$container
      if (!ast.isTopLevelDeclaration(container) || container.visibility !== 'share') {
        return true
      }
    }

    return false
  }
}
