import { compileNode } from '@compiler/codegen/codegen-util'
import { nodePath } from '@compiler/util/libs'
import { AST } from '@parser'
import * as LangiumGen from 'langium/generate'
import type { UriAndPath } from '../../resolution/ModuleResolution'
import { buildUriToEmitPath, emitRelativeImport } from './gen-output-paths'
import { buildImportLinesForTaoFile, buildUriToTaoMap, getDocUrisAndPaths } from './import-header-gen'
import { compileTaoFile } from './runtime-gen'

const BOOTSTRAP_RELATIVE_PATH = 'app-bootstrap.tsx'

/** dedupeTaoFilesByUri returns unique TaoFile ASTs by document URI. */
function dedupeTaoFilesByUri(files: AST.TaoFile[]): AST.TaoFile[] {
  const filesByUri = new Map<string, AST.TaoFile>()
  for (const f of files) {
    const u = f.$document?.uri.toString()
    if (u && !filesByUri.has(u)) {
      filesByUri.set(u, f)
    }
  }
  return [...filesByUri.values()]
}

/** compileOneTaoFileModule emits one RN TSX module (preamble, imports, top-level statements, Expo Router stub default export). */
function compileOneTaoFileModule(
  taoFile: AST.TaoFile,
  relativePath: string,
  uriToEmitPath: Map<string, string>,
  uriToTao: Map<string, AST.TaoFile>,
  uriAndPaths: UriAndPath[],
  stdLibRoot: string | undefined,
): LangiumGen.GeneratorNode {
  const importHeader = buildImportLinesForTaoFile(taoFile, uriToEmitPath, uriToTao, uriAndPaths, stdLibRoot)
  const result = new LangiumGen.CompositeGeneratorNode()
  const dirCount = relativePath.split(nodePath.sep).length
  const importBase = '../'.repeat(dirCount - 1)

  result.append(compileNode(taoFile)`
    // @ts-nocheck
    import * as RN from 'react-native'
    import { TaoRuntime } from '${importBase}use/@tao/tao-runtime/tao-runtime'
    ${importHeader}// ${taoFile.$document!.uri}
  `)
  const body = compileTaoFile(taoFile)
  if (body) {
    // Langium does not newline between separately appended generator nodes (URI comment was glued to `export`).
    result.append('\n').append(body)
  }
  // Expo Router treats every TSX under `app/` as a route; emitted Tao modules are library files, not screens.
  result.append(`

export default function TaoCompilerExpoRouterStub() {
  return null
}
`)
  return result
}

/** compileBootstrapNode emits the default-export app shell that imports AppUIView from the entry module. */
function compileBootstrapNode(importPathFromBootstrapToEntry: string): LangiumGen.GeneratorNode {
  const n = new LangiumGen.CompositeGeneratorNode()
  n.append(`// @ts-nocheck
import * as RN from 'react-native'
import * as React from 'react'
import { AppUIView } from '${importPathFromBootstrapToEntry}'

export default function CompiledTaoApp() {
  return (
    <RN.View style={{ flex: 1, backgroundColor: 'red' }}>
      <AppUIView />
    </RN.View>
  )
}
`)
  return n
}

/** generateTypescriptReactNativeApp emits one GeneratorNode per Tao file plus the bootstrap module. */
export function generateTypescriptReactNativeApp(
  mainTaoFile: AST.TaoFile,
  importedTaoFiles: AST.TaoFile[],
  entryAbsolutePath: string,
  stdLibRoot: string | undefined,
): {
  fileNodes: { relativePath: string; node: LangiumGen.GeneratorNode }[]
  bootstrapNode: LangiumGen.GeneratorNode
  bootstrapRelativePath: string
} {
  const allTaoFiles = dedupeTaoFilesByUri([mainTaoFile, ...importedTaoFiles])
  const { uriToEmitPath } = buildUriToEmitPath(allTaoFiles, entryAbsolutePath, stdLibRoot)
  const uriToTao = buildUriToTaoMap(allTaoFiles)
  const uriAndPaths = getDocUrisAndPaths(allTaoFiles)

  const fileNodes: { relativePath: string; node: LangiumGen.GeneratorNode }[] = []
  for (const t of allTaoFiles) {
    const uri = t.$document?.uri.toString()
    if (!uri) {
      continue
    }
    const rel = uriToEmitPath.get(uri)
    if (!rel) {
      continue
    }
    fileNodes.push({
      relativePath: rel,
      node: compileOneTaoFileModule(t, rel, uriToEmitPath, uriToTao, uriAndPaths, stdLibRoot),
    })
  }

  const entryEmit = uriToEmitPath.get(mainTaoFile.$document!.uri.toString())
  if (!entryEmit) {
    throw new Error('Entry Tao file has no emit path')
  }
  const importPath = emitRelativeImport(BOOTSTRAP_RELATIVE_PATH, entryEmit)
  const bootstrapNode = compileBootstrapNode(importPath)

  return {
    fileNodes,
    bootstrapNode,
    bootstrapRelativePath: BOOTSTRAP_RELATIVE_PATH,
  }
}
