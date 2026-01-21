import * as langium from 'langium'
import { throwUnexpectedBehaviorError } from './@shared/TaoErrors'
import * as ast from './_gen-tao-parser/ast'

/**
 * TaoScopeComputation handles symbol visibility for the Tao module system.
 *
 * Visibility rules:
 * - Default declarations: exported to global index, visible within same module (folder) only
 * - `file` declarations: only visible within the same file (not exported)
 * - `share` declarations: exported to global index, importable by other modules via `use`
 *
 * The TaoScopeProvider filters these exports based on:
 * - Same module (folder): allow default + share
 * - Cross-module (via `use`): only allow share
 */
export class TaoScopeComputation extends langium.DefaultScopeComputation {
  constructor(services: langium.LangiumCoreServices) {
    super(services)
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

  /**
   * Export all non-`file` declarations to the global index.
   * TaoScopeProvider will filter these based on module boundaries:
   * - Same module: default + share visible
   * - Cross-module (via `use`): only share visible
   */
  override async collectExportedSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.AstNodeDescription[]> {
    const exports: langium.AstNodeDescription[] = []
    const taoFile = this.getTaoFile(document)

    for (const statement of taoFile.topLevelStatements) {
      await langium.interruptAndCheck(cancelToken)

      // Export all declarations except `file` (private) ones
      // Guard: statement.name may be undefined for malformed/partial parses
      if (ast.isDeclaration(statement) && statement.visibility !== 'file' && statement.name) {
        exports.push(this.descriptions.createDescription(statement, statement.name, document))
      }
    }

    return exports
  }

  /**
   * Collect local symbols visible within this file.
   * - All non-file declarations are visible at file scope (for same-module references)
   * - `file` declarations are only visible within the same file
   */
  override async collectLocalSymbols(
    document: langium.LangiumDocument,
    cancelToken = langium.Cancellation.CancellationToken.None,
  ): Promise<langium.LocalSymbols> {
    const scopes = new langium.MultiMap<langium.AstNode, langium.AstNodeDescription>()
    const taoFile = this.getTaoFile(document)

    for (const statement of taoFile.topLevelStatements) {
      await langium.interruptAndCheck(cancelToken)

      // Add all declarations (except file-private) to file scope
      // This makes them available for same-module references
      // Guard: statement.name may be undefined for malformed/partial parses
      if (ast.isDeclaration(statement) && statement.name) {
        scopes.add(taoFile, this.descriptions.createDescription(statement, statement.name, document))
      }
    }

    return scopes
  }
}
