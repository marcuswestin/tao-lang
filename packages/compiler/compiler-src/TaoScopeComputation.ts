import * as langium from 'langium'
import { throwUnexpectedBehaviorError } from './@shared/TaoErrors'
import * as ast from './_gen-tao-parser/ast'
import { assertNever } from './compiler-utils'

export class TaoScopeComputation extends langium.DefaultScopeComputation {
  // Collect all top level declarations that should be exported for
  // other file `use` statements of `share`-marked declarations, and for
  // same-module references of unmarked declarations.
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

  private processStatementForExport(
    statement: ast.TopLevelStatement,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription | null {
    if (ast.isVisibilityMarkedDeclaration(statement)) {
      if (this.isExportableVisibilityDeclaration(statement)) {
        const declaration = statement.declaration
        return this.descriptions.createDescription(declaration, declaration.name, document)
      }
    } else if (ast.isTopLevelStatement(statement) && ast.isDeclaration(statement)) {
      // Export declarations without visibility qualifiers for same-module references
      const name = statement.name
      if (name) {
        return this.descriptions.createDescription(statement, name, document)
      }
    }
    return null
  }

  // Collect local symbols visible within this file: views, lets, function parameters, etc.
  override async collectLocalSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.LocalSymbols> {
    const rootNode = this.getTaoFile(document)
    const localSymbols = new langium.MultiMap<langium.AstNode, langium.AstNodeDescription>()

    for await (const node of this.iterateAllNodesIn(rootNode, cancelToken)) {
      // TODO: Collect other localSymbols, like function parameters, etc.
      if (ast.isDeclaration(node)) {
        this.collectSymbolForScope(node, document, localSymbols)
      } else if (ast.isVisibilityMarkedDeclaration(node)) {
        this.collectSymbolForScope(node.declaration, document, localSymbols, node.$container)
      }
    }

    return localSymbols
  }

  // Internal helpers
  // ----------------

  private isExportableVisibilityDeclaration(
    statement: ast.TopLevelStatement,
  ): statement is ast.VisibilityMarkedDeclaration {
    if (!ast.isVisibilityMarkedDeclaration(statement)) {
      return false
    }
    if (!statement.declaration.name) {
      // Guard: statement.name may be undefined for malformed/partial parses
      return false
    }

    switch (statement.visibility) {
      case undefined:
        // Default to module-visible -- these will be filtered to same-module references only by TaoScopeProvider
        return true
      case 'share':
        return true
      case 'file':
        // Don't export file-private declarations
        return false
      default:
        assertNever(statement.visibility)
    }
  }

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

  private collectSymbolForScope(
    node: langium.AstNode,
    document: langium.LangiumDocument,
    localSymbols: langium.MultiMap<langium.AstNode, langium.AstNodeDescription>,
    scopeNode?: langium.AstNode,
  ): void {
    scopeNode = scopeNode ?? node.$container
    if (!scopeNode) {
      return
    }
    const name = this.nameProvider.getName(node);
    if (name) {
        localSymbols.add(scopeNode, this.descriptions.createDescription(node, name, document));
    }
  }

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
