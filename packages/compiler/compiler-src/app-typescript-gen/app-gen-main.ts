import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
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
  return compileNode(taoFile)`
    // ${taoFile.$document!.uri}
    ${compileNodeListProperty(taoFile, 'topLevelStatements', compileTopLevelStatement)}
  `
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
