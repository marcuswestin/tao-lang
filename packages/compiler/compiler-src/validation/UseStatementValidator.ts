import { AST, ASTUtils } from '@parser'
import * as langium from 'langium'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
  type UriAndPath,
} from '../ModuleResolution'
import { isStdLibImport } from '../StdLibPaths'

/** UseStatementValidator validates use imports and enforces share/file visibility rules.
 * - Same-module: module-visible names; file-private blocked across files.
 * - Cross-module: only share exports. */
export class UseStatementValidator {
  constructor(
    private readonly indexManager: langium.IndexManager,
    private readonly documents: langium.LangiumDocuments,
    private readonly stdLibRoot?: string,
  ) {}

  /** checkUseStatement reports errors for invalid or unreachable imports. */
  checkUseStatement(
    useStatement: AST.UseStatement,
    accept: langium.ValidationAcceptor,
  ): void {
    const document = langium.AstUtils.getDocument(useStatement)

    // Skip validation for non-file URIs (e.g., tao-string:// used in single-file parsing tests)
    if (document.uri.scheme !== 'file') {
      return
    }

    if (useStatement.modulePath && isStdLibImport(useStatement.modulePath) && !this.stdLibRoot) {
      accept('error', 'Standard library root is not configured; cannot resolve @tao/... imports.', {
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

  /** validateSameModuleImports checks that each import exists in the module and is not file-only from elsewhere. */
  private validateSameModuleImports(
    useStatement: AST.UseStatement,
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

  /** validateCrossModuleImports checks that each import is a share export in the target module. */
  private validateCrossModuleImports(
    useStatement: AST.UseStatement,
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

  /** getDocUrisAndPaths returns all workspace document uri/path pairs. */
  private getDocUrisAndPaths(): UriAndPath[] {
    return Array.from(this.documents.all, (doc) => ({
      uri: doc.uri.toString(),
      path: doc.uri.path,
    }))
  }

  /** getTargetUrisForUseStatement returns target URIs and the same-module flag for resolution. */
  private getTargetUrisForUseStatement(
    useStatement: AST.UseStatement,
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

  /** getAccessibleSameModuleDeclarations returns importable descriptions in same-module target URIs. */
  private getAccessibleSameModuleDeclarations(targetUris: string[]): langium.AstNodeDescription[] {
    const uriSet = new Set(targetUris)
    const results: langium.AstNodeDescription[] = []

    for (const desc of this.indexManager.allElements()) {
      if (!uriSet.has(desc.documentUri.toString())) {
        continue
      }
      const node = desc.node
      if (!AST.isImportableDeclaration(node)) {
        continue
      }
      results.push(desc)
    }

    return results
  }

  /** isFilePrivateDeclaration returns true if the name is declared file-private in target docs. */
  private isFilePrivateDeclaration(name: string, targetUris: string[]): boolean {
    const uriSet = new Set(targetUris)
    for (const doc of this.documents.all) {
      if (!uriSet.has(doc.uri.toString())) {
        continue
      }
      const value = doc.parseResult.value
      if (!AST.isTaoFile(value)) {
        continue
      }
      const taoFile = value
      for (const stmt of taoFile.statements) {
        if (
          AST.isModuleDeclaration(stmt)
          && stmt.visibility === 'file'
          && stmt.declaration.name === name
        ) {
          return true
        }
      }
    }
    return false
  }

  /** getShareDeclarations returns share-marked importable descriptions in target URIs. */
  private getShareDeclarations(targetUris: string[]): langium.AstNodeDescription[] {
    const uriSet = new Set(targetUris)
    const results: langium.AstNodeDescription[] = []

    for (const desc of this.indexManager.allElements()) {
      if (!uriSet.has(desc.documentUri.toString())) {
        continue
      }

      const node = desc.node
      if (!AST.isImportableDeclaration(node)) {
        continue
      }

      const container = node.$container
      if (ASTUtils.isSharedModuleDeclaration(container)) {
        results.push(desc)
      }
    }

    return results
  }

  /** declarationExistsButNotShared returns true if the name exists in target URIs but is not share-exported. */
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
      if (!AST.isImportableDeclaration(node)) {
        continue
      }

      const container = node.$container
      if (!ASTUtils.isSharedModuleDeclaration(container)) {
        return true
      }
    }

    return false
  }
}
