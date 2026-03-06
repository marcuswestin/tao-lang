import * as langium from 'langium'
import { DefaultDefinitionProvider, type LangiumServices } from 'langium/lsp'
import type { DefinitionParams } from 'vscode-languageserver'
import { LocationLink } from 'vscode-languageserver'
import { TAO_EXT } from './@shared/TaoPaths'
import * as ast from './_gen-tao-parser/ast'
import { normalizedDirOfPath, resolveModulePathFromFile } from './Paths'
import { isStdLibImport, resolveStdLibModuleDirectory } from './StdLibPaths'

// TaoDefinitionProvider adds go-to-definition for imported names in use statements.
export class TaoDefinitionProvider extends DefaultDefinitionProvider {
  private readonly indexManager: langium.IndexManager
  private readonly documents: langium.LangiumDocuments
  private readonly stdLibRoot?: string

  constructor(services: LangiumServices, stdLibRoot?: string) {
    super(services)
    this.indexManager = services.shared.workspace.IndexManager
    this.documents = services.shared.workspace.LangiumDocuments
    this.stdLibRoot = stdLibRoot
  }

  protected override collectLocationLinks(
    sourceCstNode: langium.CstNode,
    _params: DefinitionParams,
  ): langium.MaybePromise<LocationLink[] | undefined> {
    const useStatementLink = this.tryGetUseStatementDefinition(sourceCstNode)
    if (useStatementLink) {
      return [useStatementLink]
    }
    return super.collectLocationLinks(sourceCstNode, _params)
  }

  // tryGetUseStatementDefinition returns a LocationLink if the source node is an imported name in a use statement.
  private tryGetUseStatementDefinition(sourceCstNode: langium.CstNode): LocationLink | undefined {
    const astNode = sourceCstNode.astNode
    if (!ast.isUseStatement(astNode)) {
      return undefined
    }

    const importedName = sourceCstNode.text
    if (!astNode.importedNames.includes(importedName)) {
      return undefined
    }
    const document = langium.AstUtils.getDocument(astNode)
    const targetUris = this.getTargetUrisForUseStatement(astNode, document)
    const targetDesc = this.findDeclarationInUris(importedName, targetUris, astNode, document)
    if (!targetDesc?.node) {
      return undefined
    }

    const targetNode = targetDesc.node
    const targetDocument = langium.AstUtils.getDocument(targetNode)
    const targetCst = targetNode.$cstNode
    if (!targetCst) {
      return undefined
    }

    return LocationLink.create(
      targetDocument.textDocument.uri,
      targetCst.range,
      targetCst.range,
      sourceCstNode.range,
    )
  }

  private getTargetUrisForUseStatement(
    useStmt: ast.UseStatement,
    document: langium.LangiumDocument,
  ): string[] {
    const sameModule = this.isSameModuleImport(useStmt, document)
    if (sameModule) {
      return this.getSameModuleUris(document)
    }
    if (!useStmt.modulePath) {
      return []
    }
    return this.resolveModulePath(useStmt.modulePath, document)
  }

  private isSameModuleImport(useStmt: ast.UseStatement, document: langium.LangiumDocument): boolean {
    if (!useStmt.modulePath) {
      return true
    }
    if (isStdLibImport(useStmt.modulePath)) {
      return false
    }
    const currentDir = normalizedDirOfPath(document.uri.path)
    const targetPath = resolveModulePathFromFile(document.uri.path, useStmt.modulePath)
    return targetPath === currentDir
  }

  private getSameModuleUris(document: langium.LangiumDocument): string[] {
    const currentDir = normalizedDirOfPath(document.uri.path)
    const uriSet = new Set<string>()
    for (const desc of this.indexManager.allElements()) {
      const descDir = normalizedDirOfPath(desc.documentUri.path)
      if (descDir === currentDir && desc.documentUri.toString() !== document.uri.toString()) {
        uriSet.add(desc.documentUri.toString())
      }
    }
    return [...uriSet]
  }

  private resolveModulePath(modulePath: string, document: langium.LangiumDocument): string[] {
    if (!modulePath) {
      return []
    }
    const targetPath = isStdLibImport(modulePath)
      ? resolveStdLibModuleDirectory(modulePath, this.stdLibRoot!)
      : resolveModulePathFromFile(document.uri.path, modulePath)
    const targetFileWithExt = targetPath + TAO_EXT
    const uris: string[] = []
    for (const doc of this.documents.all) {
      const docPath = doc.uri.path
      const docDir = normalizedDirOfPath(docPath)
      if (docPath === targetFileWithExt || docDir === targetPath) {
        uris.push(doc.uri.toString())
      }
    }
    return [...new Set(uris)]
  }

  private findDeclarationInUris(
    name: string,
    targetUris: string[],
    useStmt: ast.UseStatement,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription | undefined {
    const sameModule = this.isSameModuleImport(useStmt, document)
    const targetUriSet = new Set(targetUris)

    for (const desc of this.indexManager.allElements(ast.Declaration.$type, targetUriSet)) {
      if (desc.name !== name) {
        continue
      }
      const node = desc.node
      if (!node || !ast.isDeclaration(node)) {
        continue
      }
      if (sameModule) {
        return desc
      }
      if (!ast.isVisibilityMarkedDeclaration(node.$container) || node.$container.visibility !== 'share') {
        continue
      }
      return desc
    }
    return undefined
  }
}
