import { AST } from '@parser'
import * as langium from 'langium'
import { DefaultDefinitionProvider, type LangiumServices } from 'langium/lsp'
import type { DefinitionParams } from 'vscode-languageserver'
import { LocationLink } from 'vscode-languageserver'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
} from './ModuleResolution'

// TaoDefinitionProvider adds go-to-definition for imported names in use statements.
export class TaoDefinitionProvider extends DefaultDefinitionProvider {
  private readonly indexManager: langium.IndexManager
  private readonly documents: langium.LangiumDocuments

  constructor(services: LangiumServices, private readonly stdLibRoot?: string) {
    super(services)
    this.indexManager = services.shared.workspace.IndexManager
    this.documents = services.shared.workspace.LangiumDocuments
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
    if (!AST.isUseStatement(astNode)) {
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
    useStmt: AST.UseStatement,
    document: langium.LangiumDocument,
  ): string[] {
    const sameModule = isSameModuleImport(useStmt, document.uri.path)
    if (sameModule) {
      const indexUrisAndPaths = Array.from(this.indexManager.allElements(), (desc) => ({
        uri: desc.documentUri.toString(),
        path: desc.documentUri.path,
      }))
      return getSameModuleUris(document.uri.path, document.uri.toString(), indexUrisAndPaths)
    }
    if (!useStmt.modulePath) {
      return []
    }
    const docUrisAndPaths = Array.from(this.documents.all, (doc) => ({
      uri: doc.uri.toString(),
      path: doc.uri.path,
    }))
    return resolveModulePathToUris(
      useStmt.modulePath,
      document.uri.path,
      this.stdLibRoot,
      docUrisAndPaths,
    )
  }

  private findDeclarationInUris(
    name: string,
    targetUris: string[],
    useStmt: AST.UseStatement,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription | undefined {
    const sameModule = isSameModuleImport(useStmt, document.uri.path)
    const targetUriSet = new Set(targetUris)
    for (const desc of this.indexManager.allElements()) {
      if (!this.isMatchingDeclaration(desc, name, targetUriSet)) {
        continue
      }
      return this.findDeclarationInDesc(desc, name, targetUriSet, sameModule)
    }
    return undefined
  }

  private findDeclarationInDesc(
    desc: langium.AstNodeDescription,
    name: string,
    targetUriSet: Set<string>,
    sameModule: boolean,
  ): langium.AstNodeDescription | undefined {
    const isMatchingDeclaration = this.isMatchingDeclaration(desc, name, targetUriSet)
    if (!isMatchingDeclaration) {
      return undefined
    }

    if (sameModule) {
      return desc
    }

    const container = desc.node.$container
    if (AST.isTopLevelDeclaration(container) && container.visibility === 'share') {
      return desc
    }

    return undefined
  }

  private isMatchingDeclaration(
    desc: langium.AstNodeDescription,
    name: string,
    targetUriSet: Set<string>,
  ): desc is langium.AstNodeDescription & { node: AST.ImportableDeclaration } {
    return targetUriSet.has(desc.documentUri.toString())
      && desc.name === name
      && AST.isImportableDeclaration(desc.node)
  }
}
