import * as langium from 'langium'
import { throwUnexpectedBehaviorError } from './@shared/TaoErrors'
import { switchItemType_Exhaustive, switchProperty_Exhaustive } from './@shared/TypeSafety'
import * as ast from './_gen-tao-parser/ast'

// TaoScopeComputation collects exported and local symbols for scoping.
// It exports `share`-marked declarations for cross-file `use` imports,
// and unmarked declarations for same-module references.
export class TaoScopeComputation extends langium.DefaultScopeComputation {
  // collectExportedSymbols gathers all top-level declarations that should be exported
  // for other files' `use` statements and same-module references.
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

  // processStatementForExport creates a description for a statement if it should be exported.
  private processStatementForExport(
    statement: ast.TopLevelStatement,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription | null {
    if (this.isExportableVisibilityDeclaration(statement)) {
      const declaration = statement.declaration
      return this.descriptions.createDescription(declaration, declaration.name, document)
    }
    return null
  }

  // collectLocalSymbols gathers symbols visible within a file (views, lets, parameters)
  // and maps them to their containing scope for local symbol resolution.
  override async collectLocalSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.LocalSymbols> {
    const rootNode = this.getTaoFile(document)
    const localSymbols = new langium.MultiMap<langium.AstNode, langium.AstNodeDescription>()

    for await (const node of this.iterateAllNodesIn(rootNode, cancelToken)) {
      if (!ast.isScopeRelevantNode(node)) {
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
          if (viewDecl && ast.isViewDeclaration(viewDecl)) {
            this.collectSymbolForScope(n, document, localSymbols, viewDecl)
          }
        },
      })
    }

    return localSymbols
  }

  // Internal helpers
  // ----------------

  // isExportableVisibilityDeclaration checks if a top-level declaration should be exported.
  // Returns true for `share` and default (module-visible) declarations, false for `file` (private).
  private isExportableVisibilityDeclaration(
    statement: ast.TopLevelStatement,
  ): statement is ast.TopLevelDeclaration {
    if (
      // Only TopLevelDeclarations can be exported
      !ast.isTopLevelDeclaration(statement)
      // Guard: statement.declaration.name may be undefined for malformed/partial parses
      || !statement.declaration.name
    ) {
      return false
    }

    return switchProperty_Exhaustive(statement, 'visibility', {
      share: (): boolean => true,
      file: (): boolean => false,
      undefined: (): boolean => true,
    })
  }

  // getTaoFile extracts the TaoFile AST from a document, throwing if not present.
  private getTaoFile(document: langium.LangiumDocument): ast.TaoFile {
    const taoFile = document.parseResult.value as ast.TaoFile | undefined
    if (!taoFile) {
      throwUnexpectedBehaviorError({
        cause: new Error('LangiumDocument.parseResult.value should always be defined after parsing'),
        logInfo: { documentUri: document.uri.toString() },
      })
    }
    return taoFile
  }

  // collectSymbolForScope adds a named node to the local symbols map for its containing scope.
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

  // iterateAllNodesIn yields all AST nodes in a tree, checking for cancellation between nodes.
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
