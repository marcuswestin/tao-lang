import { isKnownTaoAppDataProviderName } from '@compiler'
import { AST, LGM } from '@parser'
import { throwUserInputRejectionError } from '@shared/TaoErrors'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
  type UriAndPath,
} from '../../resolution/ModuleResolution'
import { refResolved } from '../codegen-util'
import { emitRelativeImport } from './gen-output-paths'
import type { TaoCodegenOpts } from './runtime-gen'

/** taoFileNeedsTaoDataRuntime returns true when generated code will reference `getTaoData("…")` (data blocks, queries, guard, create). */
export function taoFileNeedsTaoDataRuntime(taoFile: AST.TaoFile): boolean {
  for (const n of AST.Utils.streamAllContents(taoFile)) {
    if (AST.isDataDeclaration(n)) {
      return true
    }
    if (AST.isQueryDeclaration(n) || AST.isGuardStatement(n) || AST.isCreateStatement(n)) {
      return true
    }
  }
  return false
}

/** taoFileUsesForLoop returns true when codegen will emit `React.Fragment` keyed children for `for` loops. */
export function taoFileUsesForLoop(taoFile: AST.TaoFile): boolean {
  for (const n of AST.Utils.streamAllContents(taoFile)) {
    if (AST.isForStatement(n)) {
      return true
    }
  }
  return false
}

/** taoFileReferencesDataClientInInjectedTs returns true when any `inject` TS block text mentions `getTaoData` (needs data-client import in emitted module). */
export function taoFileReferencesDataClientInInjectedTs(taoFile: AST.TaoFile): boolean {
  for (const n of AST.Utils.streamAllContents(taoFile)) {
    if (AST.isInjection(n) && n.tsCodeBlock?.includes('getTaoData')) {
      return true
    }
  }
  return false
}

/** taoFileNeedsTaoDataImport is true when the emitted TS module should import from `tao-data-client`. */
export function taoFileNeedsTaoDataImport(taoFile: AST.TaoFile): boolean {
  return taoFileNeedsTaoDataRuntime(taoFile) || taoFileReferencesDataClientInInjectedTs(taoFile)
}

/** taoFileHasTopLevelDataDeclaration returns true when this module emits a `data` declaration (needs `setTaoData` + provider ctor imports). */
export function taoFileHasTopLevelDataDeclaration(taoFile: AST.TaoFile): boolean {
  for (const stmt of taoFile.statements) {
    const decl = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
    if (AST.isDataDeclaration(decl)) {
      return true
    }
  }
  return false
}

/** buildRuntimePreambleImports returns React / tao-data-client / InstantDB preamble lines for an emitted Tao RN module. */
export function buildRuntimePreambleImports(
  taoFile: AST.TaoFile,
  importBase: string,
  codegenOpts: TaoCodegenOpts,
): { reactImport: string; taoDataImport: string } {
  const taoDataImport = taoFileNeedsTaoDataImport(taoFile)
    ? (() => {
      const names = ['getTaoData']
      if (taoFileHasTopLevelDataDeclaration(taoFile)) {
        names.push('createTaoDataClient', 'setTaoData')
      }
      const fromClient = `import { ${names.join(', ')} } from '${importBase}use/@tao/data/providers/tao-data-client'\n`
      const providerRegistration = taoFileHasTopLevelDataDeclaration(taoFile)
        ? providerRegistrationImport(importBase, codegenOpts.appProvider.name)
        : ''
      return `${fromClient}${providerRegistration}`
    })()
    : ''
  const reactImport = taoFileUsesForLoop(taoFile) ? `import * as React from 'react'\n` : ''
  return { reactImport, taoDataImport }
}

/** providerRegistrationImport returns the side-effect import that registers a known std-lib provider factory. */
function providerRegistrationImport(importBase: string, provider: string): string {
  const normalizedProvider = provider ? provider.toLowerCase() : 'memory'
  if (!isKnownTaoAppDataProviderName(normalizedProvider)) {
    throwUserInputRejectionError(`Unknown app data provider '${provider}'.`)
  }
  return normalizedProvider === 'instantdb'
    ? `import '${importBase}use/@tao/data/providers/instantdb/instantdb'\n`
    : `import '${importBase}use/@tao/data/providers/in-memory/in-memory'\n`
}

/** buildUriToTaoMap maps document URI string to TaoFile AST. */
export function buildUriToTaoMap(allTaoFiles: AST.TaoFile[]): Map<string, AST.TaoFile> {
  const m = new Map<string, AST.TaoFile>()
  for (const t of allTaoFiles) {
    const doc = t.$document
    if (doc) {
      m.set(doc.uri.toString(), t)
    }
  }
  return m
}

/** getDocUrisAndPaths returns UriAndPath entries for all Tao documents with a file URI. */
export function getDocUrisAndPaths(allTaoFiles: AST.TaoFile[]): UriAndPath[] {
  return allTaoFiles
    .filter(t => t.$document?.uri.scheme === 'file')
    .map(t => ({ uri: t.$document!.uri.toString(), path: t.$document!.uri.path }))
}

/** topLevelDeclarationName returns the declared name for a file-level statement, if any. */
function topLevelDeclarationName(stmt: AST.Statement): string | undefined {
  if (AST.isModuleDeclaration(stmt)) {
    return stmt.declaration.name
  }
  if (AST.isDeclaration(stmt)) {
    return stmt.name
  }
  return undefined
}

/** findDefiningUriForName returns the document URI that defines `name` among the given target URIs. */
function findDefiningUriForName(
  name: string,
  targetUris: string[],
  uriToTao: Map<string, AST.TaoFile>,
): string | undefined {
  for (const uri of targetUris) {
    const t = uriToTao.get(uri)
    if (!t) {
      continue
    }
    for (const stmt of t.statements) {
      if (topLevelDeclarationName(stmt) === name) {
        return uri
      }
    }
  }
  return undefined
}

/** collectViewCrossDocumentImports adds imports for view references that resolve outside `doc`. */
function collectViewCrossDocumentImports(
  taoFile: AST.TaoFile,
  doc: AST.Document,
  currentEmit: string,
  uriToEmitPath: Map<string, string>,
  importMap: Map<string, Set<string>>,
) {
  for (const stmt of taoFile.statements) {
    const viewDecl = topLevelViewDeclaration(stmt)
    if (viewDecl) {
      walkViewDecl(viewDecl, doc, currentEmit, uriToEmitPath, importMap)
    }
  }
}

/** topLevelViewDeclaration returns a top-level view declaration from a file statement, if any. */
function topLevelViewDeclaration(stmt: AST.Statement): AST.ViewDeclaration | undefined {
  if (AST.isModuleDeclaration(stmt) && AST.isViewDeclaration(stmt.declaration)) {
    return stmt.declaration
  }
  if (AST.isViewDeclaration(stmt)) {
    return stmt
  }
  return undefined
}

/** walkViewDecl walks nested views and records cross-document view render imports. */
function walkViewDecl(
  decl: AST.ViewDeclaration,
  doc: AST.Document,
  currentEmit: string,
  uriToEmitPath: Map<string, string>,
  importMap: Map<string, Set<string>>,
) {
  for (const s of decl.block.statements) {
    walkViewStatement(s, doc, currentEmit, uriToEmitPath, importMap)
  }
}

/** walkViewStatement records cross-document view imports for a view-body or nested-block statement. */
function walkViewStatement(
  s: AST.Statement,
  doc: AST.Document,
  currentEmit: string,
  uriToEmitPath: Map<string, string>,
  importMap: Map<string, Set<string>>,
): void {
  if (AST.isViewRender(s)) {
    const viewDecl = refResolved(s.view, 'ViewRender.view')
    const defDoc = LGM.AstUtils.getDocument(viewDecl)
    if (defDoc && defDoc.uri.toString() !== doc.uri.toString()) {
      const targetEmit = uriToEmitPath.get(defDoc.uri.toString())
      if (targetEmit && targetEmit !== currentEmit) {
        let set = importMap.get(targetEmit)
        if (!set) {
          set = new Set()
          importMap.set(targetEmit, set)
        }
        set.add(viewDecl.name)
      }
    }
    if (s.block) {
      for (const inner of s.block.statements) {
        walkViewStatement(inner, doc, currentEmit, uriToEmitPath, importMap)
      }
    }
    return
  }
  if (AST.isViewDeclaration(s)) {
    walkViewDecl(s, doc, currentEmit, uriToEmitPath, importMap)
    return
  }
  if (AST.isForStatement(s)) {
    for (const inner of s.block.statements) {
      walkViewStatement(inner, doc, currentEmit, uriToEmitPath, importMap)
    }
  }
}

/** buildImportLinesForTaoFile returns ES import lines (with trailing newline if non-empty) for cross-file symbols. */
export function buildImportLinesForTaoFile(
  taoFile: AST.TaoFile,
  uriToEmitPath: Map<string, string>,
  uriToTao: Map<string, AST.TaoFile>,
  uriAndPaths: UriAndPath[],
  stdLibRoot: string | undefined,
): string {
  const doc = taoFile.$document as AST.Document | undefined
  if (!doc || doc.uri.scheme !== 'file') {
    return ''
  }
  const currentEmit = uriToEmitPath.get(doc.uri.toString())
  if (!currentEmit) {
    return ''
  }
  const importMap = new Map<string, Set<string>>()

  for (const stmt of taoFile.statements) {
    if (!AST.isUseStatement(stmt)) {
      continue
    }
    let targetUris: string[]
    if (stmt.modulePath) {
      const sameModule = isSameModuleImport(stmt, doc.uri.path)
      targetUris = sameModule
        ? getSameModuleUris(doc.uri.path, doc.uri.toString(), uriAndPaths)
        : resolveModulePathToUris(stmt.modulePath, doc.uri.path, stdLibRoot, uriAndPaths)
    } else {
      targetUris = getSameModuleUris(doc.uri.path, doc.uri.toString(), uriAndPaths)
    }
    for (const name of stmt.importedNames) {
      const defUri = findDefiningUriForName(name, targetUris, uriToTao)
      if (!defUri) {
        continue
      }
      const targetEmit = uriToEmitPath.get(defUri)
      if (!targetEmit || targetEmit === currentEmit) {
        continue
      }
      let set = importMap.get(targetEmit)
      if (!set) {
        set = new Set()
        importMap.set(targetEmit, set)
      }
      set.add(name)
    }
  }

  collectViewCrossDocumentImports(taoFile, doc, currentEmit, uriToEmitPath, importMap)

  const lines: string[] = []
  const sortedTargets = [...importMap.keys()].sort()
  for (const targetEmit of sortedTargets) {
    const names = importMap.get(targetEmit)!
    const rel = emitRelativeImport(currentEmit, targetEmit)
    lines.push(`import { ${[...names].sort().join(', ')} } from '${rel}'`)
  }
  return lines.length > 0 ? `${lines.join('\n')}\n\n` : ''
}
