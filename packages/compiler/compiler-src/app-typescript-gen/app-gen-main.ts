import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@compiler/grammar'
import * as LangiumGen from 'langium/generate'
import { compileTopLevelStatement } from './file-toplevel-gen'

export type GeneratedApp = {
  text: string
  trace: LangiumGen.TraceRegion
}

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

function compilePreamble(mainTaoFile: AST.TaoFile): Compiled {
  return compileNode(mainTaoFile)`
    // @ts-nocheck
    import * as RN from 'react-native'\n\n
  `
}

function compileTaoFile(taoFile: AST.TaoFile): Compiled {
  return compileNode(taoFile)`
    // ${taoFile.$document!.uri}
    ${compileNodeListProperty(taoFile, 'topLevelStatements', compileTopLevelStatement)}
  `
}

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
