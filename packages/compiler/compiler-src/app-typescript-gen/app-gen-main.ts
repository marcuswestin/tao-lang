import {
  Compiled,
  compileNode,
  compileNodeList,
  compileNodeListProperty,
  compileNodeProperty,
} from '@compiler/compiler-utils'
import { AST } from '@parser'
import * as LangiumGen from 'langium/generate'
import { compileTopLevelStatement } from './file-toplevel-gen'

export type GeneratedApp = {
  text: string
  trace: LangiumGen.TraceRegion
}

/** generateTypescriptReactNativeApp emits RN TSX for the main and imported Tao files. */
export function generateTypescriptReactNativeApp(
  mainTaoFile: AST.TaoFile,
  importedTaoFiles: AST.TaoFile[],
): LangiumGen.GeneratorNode {
  const filesToCompile = [...importedTaoFiles, mainTaoFile]

  const result = new LangiumGen.CompositeGeneratorNode()
  result.append(compilePreamble(mainTaoFile))
  result.append(...filesToCompile.map(compileTaoFile))
  result.append(compileMainView(mainTaoFile))

  return result
}

/** compilePreamble emits the ts-nocheck and react-native import preamble. */
function compilePreamble(mainTaoFile: AST.TaoFile): Compiled {
  return compileNode(mainTaoFile)`
    // @ts-nocheck
    import * as RN from 'react-native'\n\n
  `
}

/** compileTaoFile emits top-level statements for one Tao file as a traced TSX chunk. */
function compileTaoFile(taoFile: AST.TaoFile): Compiled {
  // TODO: emit exports object for all non-file-scoped top level declarations.
  return compileNode(taoFile)`
    // ${taoFile.$document!.uri}
    ${compileExportsObject(taoFile)}
    ${compileNodeListProperty(taoFile, 'topLevelStatements', compileTopLevelStatement)}
  `
}

/** compileExportsObject emits exports object for all non-file-scoped top level declarations. */
function compileExportsObject(taoFile: AST.TaoFile): Compiled {
  // TODO: Start compiling to multiple files, and enable exports
  return undefined
  const exports = taoFile.topLevelStatements.filter(isVisibleTopLevelDeclaration)
  return compileNodeList(exports, (exportNode) =>
    compileNode(exportNode)`
      export const ${exportNode.declaration.name} = ${compileNodeProperty(exportNode.declaration, 'name')}\n
    `)
}

/** isVisibleTopLevelDeclaration returns true for top level declarations that are not file-scoped. */
function isVisibleTopLevelDeclaration(node: AST.TopLevelStatement): node is AST.TopLevelDeclaration {
  return AST.isTopLevelDeclaration(node) && node.visibility !== 'file'
}

/** compileMainView emits the default export app shell wrapping AppUIView. */
function compileMainView(mainTaoFile: AST.TaoFile): Compiled {
  return compileNode(mainTaoFile)`
    export default function CompiledTaoApp() {
      return (
        <RN.View style={{ flex: 1, backgroundColor: 'red' }}>
          <AppUIView />
        </RN.View>
      )
    }
  `
}
