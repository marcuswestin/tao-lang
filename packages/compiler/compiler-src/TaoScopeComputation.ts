import { AST } from '@parser'
import { throwUnexpectedBehaviorError } from '@shared/TaoErrors'
import { switchItemType_Exhaustive, switchProperty_Exhaustive } from '@shared/TypeSafety'
import * as langium from 'langium'

/** TaoScopeComputation builds exported and local symbol tables for Tao files.
 * - Cross-module use sees share exports; same-module sees module-visible names. */
export class TaoScopeComputation extends langium.DefaultScopeComputation {
  /** collectExportedSymbols collects top-level declarations for use and same-module resolution. */
  override async collectExportedSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.AstNodeDescription[]> {
    const exports: langium.AstNodeDescription[] = []
    const taoFile = this.getTaoFile(document)

    for (const statement of taoFile.topLevelStatements) {
      await langium.interruptAndCheck(cancelToken)
      const description = this.processStatementForExport(statement, document)
      if (description) {
        exports.push(description)
      }
    }

    return exports
  }

  /** processStatementForExport returns an AstNodeDescription for exportable top-level declarations. */
  private processStatementForExport(
    statement: AST.TopLevelStatement,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription | null {
    if (this.isExportableVisibilityDeclaration(statement)) {
      const declaration = statement.declaration
      return this.descriptions.createDescription(declaration, declaration.name, document)
    }
    return null
  }

  /** collectLocalSymbols maps scope nodes to locally visible named symbols. */
  override async collectLocalSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.LocalSymbols> {
    const rootNode = this.getTaoFile(document)
    const localSymbols = new langium.MultiMap<langium.AstNode, langium.AstNodeDescription>()

    for await (const node of this.iterateAllNodesIn(rootNode, cancelToken)) {
      if (!AST.isScopeRelevantNode(node)) {
        continue
      }
      switchItemType_Exhaustive(node, {
        UseStatement: (n) => this.collectSymbolForScope(n, document, localSymbols),
        TopLevelDeclaration: (n) => this.collectSymbolForScope(n.declaration, document, localSymbols, n.$container),
        Injection: () => void 0,
        ViewDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        AliasDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        AppDeclaration: (n) => this.collectSymbolForScope(n, document, localSymbols),
        ParameterDeclaration: (n) => {
          const viewDecl = n.$container?.$container
          if (AST.isViewDeclaration(viewDecl)) {
            this.collectSymbolForScope(n, document, localSymbols, viewDecl)
          }
        },
      })
    }

    return localSymbols
  }

  /** isExportableVisibilityDeclaration returns true for share/module/default visibility exportable statements. */
  private isExportableVisibilityDeclaration(
    statement: AST.TopLevelStatement,
  ): statement is AST.TopLevelDeclaration {
    if (
      // Only TopLevelDeclarations can be exported
      !AST.isTopLevelDeclaration(statement)
      // Guard: statement.declaration.name may be undefined for malformed/partial parses
      || !statement.declaration.name
    ) {
      return false
    }

    return switchProperty_Exhaustive(statement, 'visibility', {
      share: (): boolean => true,
      file: (): boolean => false,
      module: (): boolean => true,
      undefined: (): boolean => true,
    })
  }

  /** getTaoFile returns the parse result as TaoFile or throws. */
  private getTaoFile(document: langium.LangiumDocument): AST.TaoFile {
    const value = document.parseResult.value
    if (!AST.isTaoFile(value)) {
      throwUnexpectedBehaviorError({
        cause: new Error('LangiumDocument.parseResult.value should always be defined after parsing'),
        logInfo: { documentUri: document.uri.toString() },
      })
    }
    return value
  }

  /** collectSymbolForScope registers the node name under scopeNode in localSymbols. */
  private collectSymbolForScope(
    node: langium.AstNode,
    document: langium.LangiumDocument,
    localSymbols: langium.MultiMap<langium.AstNode, langium.AstNodeDescription>,
    scopeNode?: langium.AstNode,
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
    rootNode: langium.AstNode,
    cancelToken: langium.Cancellation.CancellationToken,
  ): AsyncGenerator<langium.AstNode> {
    for (const node of langium.AstUtils.streamAllContents(rootNode)) {
      await langium.interruptAndCheck(cancelToken)
      yield node
    }
  }
}
