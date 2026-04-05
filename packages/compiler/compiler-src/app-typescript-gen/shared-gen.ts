import { Compiled, compileNode, compileNodeListProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import * as LangiumGen from 'langium/generate'

/** compileParameterList emits `props` typing for view/action parameters. */
export function compileParameterList(parameterList?: AST.ParameterList): Compiled {
  if (!parameterList) {
    return new LangiumGen.CompositeGeneratorNode('props: any')
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.name}: ${param.type}`
    })
  }}
  `
}
