import { AST, ASTUtils } from '@parser'
import * as langium from 'langium'
import { DefaultDefinitionProvider, type LangiumServices } from 'langium/lsp'
import type { DefinitionParams } from 'vscode-languageserver'
import { LocationLink } from 'vscode-languageserver'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
} from '../resolution/ModuleResolution'

/** TaoDefinitionProvider implements go-to-definition including use-statement imported names. */
export class TaoDefinitionProvider extends DefaultDefinitionProvider {
  private readonly indexManager: langium.IndexManager
  private readonly documents: langium.LangiumDocuments

  constructor(services: LangiumServices, private readonly stdLibRoot?: string) {
    super(services)
    this.indexManager = services.shared.workspace.IndexManager
    this.documents = services.shared.workspace.LangiumDocuments
  }

  /** collectLocationLinks returns use-statement targets or delegates to default Langium behavior. */
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

  /** tryGetUseStatementDefinition returns a LocationLink when the cursor is on a use import name. */
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

  /** getTargetUrisForUseStatement returns document URIs to search for the imported declaration. */
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

  /** findDeclarationInUris returns the first matching importable declaration in target URIs. */
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

  /** findDeclarationInDesc resolves desc if it is the named shared or same-module export. */
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
    if (ASTUtils.isSharedModuleDeclaration(container)) {
      return desc
    }

    return undefined
  }

  /** isMatchingDeclaration returns true when name and URI match an importable AST node. */
  private isMatchingDeclaration(
    desc: langium.AstNodeDescription,
    name: string,
    targetUriSet: Set<string>,
  ): desc is langium.AstNodeDescription & { node: AST.Declaration } {
    return targetUriSet.has(desc.documentUri.toString())
      && desc.name === name
      && AST.isDeclaration(desc.node)
  }
}
