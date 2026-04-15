import { LGM as langium } from '@parser'
import { AST } from '@parser/parser'
import { Assert, switch_safe } from '@shared'

/** TaoScopeComputation builds exported and local symbol tables for Tao files.
 * - Cross-module use sees share exports; same-module sees module-visible names. */
export class TaoScopeComputation extends langium.DefaultScopeComputation {
  /** collectExportedSymbols collects top-level declarations for use and same-module resolution. */
  override async collectExportedSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<AST.NodeDescription[]> {
    const exports: AST.NodeDescription[] = []
    const taoFile = this.getTaoFile(document)

    for (const statement of taoFile.statements) {
      await langium.interruptAndCheck(cancelToken)
      const description = this.processTopLevelStatementForExport(statement, document)
      if (description) {
        exports.push(description)
      }
    }

    return exports
  }

  /** processTopLevelStatementForExport returns an AST.NodeDescription for exportable top-level declarations. */
  private processTopLevelStatementForExport(
    statement: AST.Statement,
    document: langium.LangiumDocument,
  ): AST.NodeDescription | null {
    Assert(statement.$container.$type === 'TaoFile', 'expected top-level statement')
    if (AST.isModuleDeclaration(statement)) {
      if (statement.visibility === 'file') {
        return null
      }
      const declaration = statement.declaration
      return this.descriptions.createDescription(declaration, declaration.name, document)
    }
    if (AST.isDeclaration(statement)) {
      return this.descriptions.createDescription(statement, statement.name, document)
    }
    return null
  }

  /** collectLocalSymbols maps scope nodes to locally visible named symbols. */
  override async collectLocalSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.LocalSymbols> {
    const rootNode = this.getTaoFile(document)
    const localSymbols = new langium.MultiMap<AST.Node, AST.NodeDescription>()

    for await (const node of this.iterateAllNodesIn(rootNode, cancelToken)) {
      if (AST.isModuleDeclaration(node)) {
        this.collectSymbolForScope(node.declaration, document, localSymbols, node.$container)
        continue
      }
      if (!AST.isScopeRelevantNode(node)) {
        continue
      }
      switch_safe.type(node, {
        UseStatement: (n) => this.collectSymbolForScope(n, document, localSymbols),
        AppDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        AssignmentDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        ViewDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        ActionDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        ParameterDeclaration: (n) => this.collectParameterSymbolForScope(n, document, localSymbols),
      })
    }

    return localSymbols
  }

  /** collectParameterSymbolForScope registers the parameter name under scopeNode in localSymbols. */
  private collectParameterSymbolForScope(
    node: AST.Node,
    document: langium.LangiumDocument,
    localSymbols: langium.MultiMap<AST.Node, AST.NodeDescription>,
  ) {
    const paramList = node.$container
    const parentDecl = paramList?.$container
    if (!AST.isParameterList(paramList) || !AST.isBlockDeclaration(parentDecl)) {
      return
    }
    this.collectSymbolForScope(node, document, localSymbols, parentDecl)
  }

  /** getTaoFile returns the parse result as TaoFile or throws. */
  private getTaoFile(document: langium.LangiumDocument): AST.TaoFile {
    const value = document.parseResult.value
    Assert.is(value, AST.isTaoFile, 'LangiumDocument.parseResult.value should always be a TaoFile', {
      documentUri: document.uri.toString(),
    })
    return value
  }

  /** collectSymbolForScope registers the node name under scopeNode in localSymbols. */
  private collectSymbolForScope(
    node: AST.Node,
    document: langium.LangiumDocument,
    localSymbols: langium.MultiMap<AST.Node, AST.NodeDescription>,
    scopeNode?: AST.Node,
  ) {
    scopeNode ??= node.$container
    if (!scopeNode) {
      return
    }
    const name = this.nameProvider.getName(node)
    if (name) {
      localSymbols.add(scopeNode, this.descriptions.createDescription(node, name, document))
    }
  }

  /** iterateAllNodesIn depth-first streams all nodes with cancel checks.
   * @yields each AST node under rootNode. */
  private async *iterateAllNodesIn(
    rootNode: AST.Node,
    cancelToken: langium.Cancellation.CancellationToken,
  ): AsyncGenerator<AST.Node> {
    for (const node of langium.AstUtils.streamAllContents(rootNode)) {
      await langium.interruptAndCheck(cancelToken)
      yield node
    }
  }
}
