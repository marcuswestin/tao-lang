import { AST } from '@parser'
import * as langium from 'langium'
import {
  getSameModuleUris,
  isSameModuleImport,
  resolveModulePathToUris,
  type UriAndPath,
} from '../ModuleResolution'
import { emitRelativeImport } from './gen-output-paths'

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
  const out: UriAndPath[] = []
  for (const t of allTaoFiles) {
    const doc = t.$document
    if (doc?.uri.scheme === 'file') {
      out.push({ uri: doc.uri.toString(), path: doc.uri.path })
    }
  }
  return out
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
    for (const stmt of t.topLevelStatements) {
      if (AST.isTopLevelDeclaration(stmt) && stmt.declaration.name === name) {
        return uri
      }
    }
  }
  return undefined
}

/** collectViewCrossDocumentImports adds imports for view references that resolve outside `doc`. */
function collectViewCrossDocumentImports(
  taoFile: AST.TaoFile,
  doc: langium.LangiumDocument,
  currentEmit: string,
  uriToEmitPath: Map<string, string>,
  importMap: Map<string, Set<string>>,
) {
  for (const stmt of taoFile.topLevelStatements) {
    if (AST.isTopLevelDeclaration(stmt) && AST.isViewDeclaration(stmt.declaration)) {
      walkViewDecl(stmt.declaration, doc, currentEmit, uriToEmitPath, importMap)
    }
  }
}

/** walkViewDecl walks nested views and records cross-document view render imports. */
function walkViewDecl(
  decl: AST.ViewDeclaration,
  doc: langium.LangiumDocument,
  currentEmit: string,
  uriToEmitPath: Map<string, string>,
  importMap: Map<string, Set<string>>,
) {
  for (const vs of decl.viewStatements) {
    if (AST.isViewRenderStatement(vs)) {
      const viewDecl = vs.view.ref
      if (viewDecl) {
        const defDoc = langium.AstUtils.getDocument(viewDecl)
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
      }
    } else if (AST.isViewDeclaration(vs)) {
      walkViewDecl(vs, doc, currentEmit, uriToEmitPath, importMap)
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
  const doc = taoFile.$document
  if (!doc || doc.uri.scheme !== 'file') {
    return ''
  }
  const currentEmit = uriToEmitPath.get(doc.uri.toString())
  if (!currentEmit) {
    return ''
  }
  const importMap = new Map<string, Set<string>>()

  for (const stmt of taoFile.topLevelStatements) {
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
