import { compileNode, CompositeGeneratorNode, GeneratorNode } from '@compiler/codegen/codegen-util'
import type { UriAndPath } from '@compiler/resolution/ModuleResolution'
import { AST } from '@parser'
import { FS } from '@shared'
import { decodeTaoTemplateTextChunk } from '../tao-template-text-chunk'
import {
  isAppConfigObject,
  mergeTaoAppConfig,
  normalizeTaoAppConfigObject,
  type TaoAppConfig,
  type TaoAppConfigObject,
} from './app-config'
import { buildUriToEmitPath, emitRelativeImport } from './gen-output-paths'
import {
  buildImportLinesForTaoFile,
  buildRuntimePreambleImports,
  buildUriToTaoMap,
  getDocUrisAndPaths,
} from './import-header-gen'
import {
  compileTaoFile,
  type TaoCodegenInputOpts,
  type TaoCodegenOpts,
  type TaoResolvedAppProvider,
} from './runtime-gen'

const BOOTSTRAP_RELATIVE_PATH = 'app-bootstrap.tsx'

/** generateTypescriptReactNativeApp emits one GeneratorNode per Tao file plus the bootstrap module. */
export function generateTypescriptReactNativeApp(
  mainTaoFile: AST.TaoFile,
  importedTaoFiles: AST.TaoFile[],
  entryAbsolutePath: string,
  stdLibRoot: string | undefined,
  codegenInputOpts?: TaoCodegenInputOpts,
): {
  fileNodes: { relativePath: string; node: GeneratorNode }[]
  bootstrapNode: GeneratorNode
  bootstrapRelativePath: string
} {
  const allTaoFiles = dedupeTaoFilesByUri([mainTaoFile, ...importedTaoFiles])
  const resolvedCodegen = buildMergedEntryCodegenOpts(mainTaoFile, codegenInputOpts)
  const { uriToEmitPath } = buildUriToEmitPath(allTaoFiles, entryAbsolutePath, stdLibRoot)
  const uriToTao = buildUriToTaoMap(allTaoFiles)
  const uriAndPaths = getDocUrisAndPaths(allTaoFiles)

  const fileNodes: { relativePath: string; node: GeneratorNode }[] = []
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
      node: compileOneTaoFileModule(t, rel, uriToEmitPath, uriToTao, uriAndPaths, stdLibRoot, resolvedCodegen),
    })
  }

  const entryEmit = uriToEmitPath.get(mainTaoFile.$document!.uri.toString())
  if (!entryEmit) {
    throw new Error('Entry Tao file has no emit path')
  }
  const bootstrapImports = allTaoFiles
    .map((t) => t.$document?.uri.toString())
    .filter((uri): uri is string => !!uri)
    .map((uri) => uriToEmitPath.get(uri))
    .filter((rel): rel is string => !!rel)
    .map(rel => emitRelativeImport(BOOTSTRAP_RELATIVE_PATH, rel))
  const entryImportPath = emitRelativeImport(BOOTSTRAP_RELATIVE_PATH, entryEmit)
  const bootstrapNode = compileBootstrapNode(bootstrapImports, entryImportPath)

  return {
    fileNodes,
    bootstrapNode,
    bootstrapRelativePath: BOOTSTRAP_RELATIVE_PATH,
  }
}

/** buildMergedEntryCodegenOpts merges the entry Tao file app block with optional compile overrides into resolved codegen opts. */
export function buildMergedEntryCodegenOpts(
  mainTaoFile: AST.TaoFile,
  codegenInputOpts?: TaoCodegenInputOpts,
): TaoCodegenOpts {
  const appConfig = mergeTaoAppConfig(
    appDeclarationToAppConfig(findEntryAppDeclaration(mainTaoFile)),
    { app: normalizeTaoAppConfigObject(codegenInputOpts?.app ?? {}) },
  )
  return {
    app: appConfig,
    appProvider: resolveAppProvider(appConfig),
  }
}

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
  codegenOpts: TaoCodegenOpts,
): GeneratorNode {
  const importHeader = buildImportLinesForTaoFile(taoFile, uriToEmitPath, uriToTao, uriAndPaths, stdLibRoot)
  const result = new CompositeGeneratorNode()
  const dirCount = FS.splitPath(relativePath).length
  const importBase = '../'.repeat(dirCount - 1)
  const { reactImport, taoDataImport } = buildRuntimePreambleImports(taoFile, importBase, codegenOpts)
  result.append(compileNode(taoFile)`
    import { _TaoRuntime, TR } from '${importBase}use/@tao/tao-runtime/tao-runtime'
    ${reactImport}${taoDataImport}${importHeader} // ${taoFile.$document!.uri}
  `)
  const body = compileTaoFile(taoFile, codegenOpts)
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

/** resolveAppProvider returns the app-level data provider selected by Tao source plus `--app` overrides. */
function resolveAppProvider(config: TaoAppConfig): TaoResolvedAppProvider {
  const provider = config.app['provider']
  if (typeof provider === 'string') {
    return { name: provider, params: {} }
  }
  if (!isAppConfigObject(provider)) {
    return { name: 'Memory', params: {} }
  }
  const providerName = stringConfigValue(provider, 'name') ?? stringConfigValue(provider, 'kind') ?? 'Memory'
  const params = configEntriesExcept(provider, ['name', 'kind'])
  return {
    name: providerName,
    params,
  }
}

/** findEntryAppDeclaration returns the first app declaration in the entry Tao file, if any. */
function findEntryAppDeclaration(mainTaoFile: AST.TaoFile): AST.AppDeclaration | undefined {
  for (const stmt of mainTaoFile.statements) {
    const decl = AST.isModuleDeclaration(stmt) ? stmt.declaration : stmt
    if (!AST.isAppDeclaration(decl)) {
      continue
    }
    return decl
  }
  return undefined
}

/** appDeclarationToAppConfig maps app declaration statements into the normalized app config object. */
function appDeclarationToAppConfig(app: AST.AppDeclaration | undefined): TaoAppConfig {
  const config: TaoAppConfigObject = {}
  for (const stmt of app?.appStatements ?? []) {
    if (AST.isAppUiStatement(stmt)) {
      config['ui'] = stmt.ui.$refText
    } else if (AST.isAppProviderStatement(stmt)) {
      const provider: TaoAppConfigObject = { name: stmt.provider }
      for (const prop of stmt.properties) {
        provider[prop.name] = stringTemplateTextOnlyLiteral(prop.value) ?? ''
      }
      config['provider'] = provider
    }
  }
  return { app: config }
}

/** stringConfigValue returns a string property from an app config object. */
function stringConfigValue(config: TaoAppConfigObject, key: string): string | undefined {
  const value = config[key]
  return typeof value === 'string' ? value : undefined
}

/** configEntriesExcept returns entries from an app config object, excluding reserved keys. */
function configEntriesExcept(config: TaoAppConfigObject, excluded: string[]): TaoAppConfigObject {
  const excludedSet = new Set(excluded)
  const out: TaoAppConfigObject = {}
  for (const [key, value] of Object.entries(config)) {
    if (!excludedSet.has(key)) {
      out[key] = value
    }
  }
  return out
}

/** stringTemplateTextOnlyLiteral reads a plain string literal from a single-segment template, or `undefined`. */
function stringTemplateTextOnlyLiteral(node: AST.StringTemplateExpression | undefined): string | undefined {
  if (!node || node.segments.length !== 1) {
    return undefined
  }
  const s = node.segments[0]!
  if (s.expression !== undefined || s.text === undefined) {
    return undefined
  }
  return decodeTaoTemplateTextChunk(s.text)
}

/** compileBootstrapNode emits the default-export app shell, a separate `AppUIView` import from the entry emit path, and runs every emitted Tao module init. */
function compileBootstrapNode(initImportPaths: string[], appUIViewModulePath: string): GeneratorNode {
  const n = new CompositeGeneratorNode()
  const appUiImport = `import { AppUIView } from '${appUIViewModulePath}'`
  const initImports = initImportPaths
    .map((path, idx) => `import { _taoRunAppInits as _taoRunAppInits${idx} } from '${path}'`)
    .join('\n')
  const initCalls = initImportPaths.map((_, idx) => `_taoRunAppInits${idx}()`).join('\n')
  n.append(`// @ts-nocheck
import * as RN from 'react-native'
${appUiImport}
${initImports}

${initCalls}

const _compiledTaoAppRootViewStyle = { flex: 1, backgroundColor: 'black' }

export default function CompiledTaoApp() {
  return (
    <RN.ScrollView style={_compiledTaoAppRootViewStyle}>
      <AppUIView />
    </RN.ScrollView>
  )
}
`)
  return n
}
