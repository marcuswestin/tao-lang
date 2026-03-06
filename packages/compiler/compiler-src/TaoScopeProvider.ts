import * as langium from 'langium'
import * as path from 'node:path'
import { TAO_EXT } from './@shared/TaoPaths'
import * as ast from './_gen-tao-parser/ast'
import { normalizeModulePath } from './Paths'
import { isStdLibImport, resolveStdLibModuleDirectory } from './StdLibPaths'

// TaoScopeProvider filters symbols for reference resolution based on module visibility rules.
export class TaoScopeProvider extends langium.DefaultScopeProvider {
  private readonly stdLibRoot: string

  constructor(services: langium.LangiumCoreServices, stdLibRoot: string) {
    super(services)
    this.stdLibRoot = stdLibRoot
  }

  // getScope returns the scope of available symbols for a reference context.
  override getScope(context: langium.ReferenceInfo): langium.Scope {
    if (context.property === 'view' && ast.isViewRenderStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    if (context.property === 'ui' && ast.isAppStatement(context.container)) {
      return this.getModuleScopedDeclarations(context)
    }

    return super.getScope(context)
  }

  // getModuleScopedDeclarations builds a scope chain: local -> imported.
  private getModuleScopedDeclarations(context: langium.ReferenceInfo): langium.Scope {
    const document = langium.AstUtils.getDocument(context.container)
    const taoFileNode = document.parseResult.value as ast.TaoFile

    const importedSymbols = this.getImportedSymbols(taoFileNode, document, context)
    const localScope = this.getLocalScope(context, document)

    const importedScope = this.createScope(importedSymbols)
    return this.createScope(localScope, importedScope)
  }

  // getImportedSymbols collects symbols from `use` statements.
  private getImportedSymbols(
    taoFile: ast.TaoFile,
    document: langium.LangiumDocument,
    context: langium.ReferenceInfo,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const imported: langium.AstNodeDescription[] = []

    const useStatements = taoFile.topLevelStatements.filter((stmt) => ast.isUseStatement(stmt))
    for (const useStmt of useStatements) {
      const imports = this.getImportedSymbolsForUseStatement(useStmt, referenceType, document)
      imported.push(...imports)
    }

    return imported
  }

  // getImportedSymbolsForUseStatement resolves symbols for a `use` statement.
  // Same-module imports (`use Foo` or `use Foo from ./`) accept default + share visibility.
  // Cross-module imports require `share` visibility.
  private getImportedSymbolsForUseStatement(
    useStmt: ast.UseStatement,
    referenceType: string,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription[] {
    const imported: langium.AstNodeDescription[] = []
    const sameModule = this.isSameModuleImport(useStmt, document)
    const targetUris = sameModule
      ? this.getSameModuleUris(document)
      : this.resolveModulePath(useStmt.modulePath!, document)

    for (const targetUri of targetUris) {
      const allRelevantExports = this.indexManager
        .allElements(referenceType, new Set([targetUri]))

      for (const description of allRelevantExports) {
        if (!useStmt.importedNames.includes(description.name)) {
          continue
        }

        const node = description.node
        if (!node) {
          continue
        }

        if (sameModule) {
          // Same-module: all exported declarations are accessible (file-private already excluded by ScopeComputation)
          imported.push(description)
        } else {
          // Cross-module: only `share`-marked declarations
          if (!ast.isDeclaration(node) || !ast.isVisibilityMarkedDeclaration(node.$container)) {
            continue
          }
          if (node.$container.visibility !== 'share') {
            continue
          }
          imported.push(description)
        }
      }
    }

    return imported
  }

  // isSameModuleImport returns true when a `use` statement targets the same module (directory).
  // `use Foo` (no path) is always same-module. `use Foo from ./` also resolves to same module.
  private isSameModuleImport(useStmt: ast.UseStatement, document: langium.LangiumDocument): boolean {
    if (!useStmt.modulePath) {
      return true
    }
    if (isStdLibImport(useStmt.modulePath)) {
      return false
    }
    const currentDir = path.dirname(document.uri.path)
    const targetPath = normalizeModulePath(currentDir, useStmt.modulePath)
    return targetPath === normalizeModulePath(currentDir)
  }

  // getSameModuleUris returns document URIs for all files in the same directory, excluding the current file.
  private getSameModuleUris(document: langium.LangiumDocument): string[] {
    const currentDir = normalizeModulePath(path.dirname(document.uri.path))
    const uriSet = new Set<string>()

    for (const desc of this.indexManager.allElements()) {
      const descDir = normalizeModulePath(path.dirname(desc.documentUri.path))
      if (descDir === currentDir && desc.documentUri.toString() !== document.uri.toString()) {
        uriSet.add(desc.documentUri.toString())
      }
    }

    return [...uriSet]
  }

  // getLocalScope retrieves local symbols from the document's symbol table.
  private getLocalScope(
    context: langium.ReferenceInfo,
    document: langium.LangiumDocument,
  ): langium.AstNodeDescription[] {
    const referenceType = this.reflection.getReferenceType(context)
    const localSymbols = document.localSymbols
    if (!localSymbols) {
      return []
    }

    const locals: langium.AstNodeDescription[] = []
    let current: langium.AstNode | undefined = context.container
    while (current) {
      if (localSymbols.has(current)) {
        for (const desc of localSymbols.getStream(current)) {
          if (this.reflection.isSubtype(desc.type, referenceType)) {
            locals.push(desc)
          }
        }
      }
      current = current.$container
    }

    return locals
  }

  // resolveModulePath converts a module path (relative or std-lib) to document URIs.
  private resolveModulePath(
    modulePath: string,
    document: langium.LangiumDocument,
  ): string[] {
    if (!modulePath) {
      return []
    }

    const targetPath = isStdLibImport(modulePath)
      ? resolveStdLibModuleDirectory(modulePath, this.stdLibRoot)
      : normalizeModulePath(path.dirname(document.uri.path), modulePath)

    const targetFileWithExt = targetPath + TAO_EXT

    const uris: string[] = []
    for (const doc of this.indexManager.allElements()) {
      const docPath = doc.documentUri.path
      const docDir = normalizeModulePath(path.dirname(docPath))

      if (docPath === targetFileWithExt) {
        uris.push(doc.documentUri.toString())
      } else if (docDir === targetPath) {
        uris.push(doc.documentUri.toString())
      }
    }

    return [...new Set(uris)] // Remove duplicates
  }
}
