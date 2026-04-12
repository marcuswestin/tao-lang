import { Compiled, compileNode, compileNodeListProperty, compileNodeProperty } from '@compiler/compiler-utils'
import { AST } from '@parser'
import * as langium from 'langium'
import * as LangiumGen from 'langium/generate'

/** setterId maps a state variable name to the conventional React `useState` setter identifier. */
export function setterId(stateName: string): string {
  return `set_${stateName}`
}

/** compileParameterList emits parameters for Tao views or for the inner `function` passed to `TaoRuntime.Action`.
 * - Views with no list: `props: unknown` so `--noUnusedLocals` passes when the body ignores props.
 * - Actions with no list: empty (emit `function name()`), not a dummy `props` parameter. */
export function compileParameterList(parameterList: AST.ParameterList | undefined): Compiled {
  if (!parameterList) {
    return new LangiumGen.CompositeGeneratorNode('props: unknown')
  }
  return compileNode(parameterList)`
    props: {${
    compileNodeListProperty(parameterList, 'parameters', param => {
      return compileNode(param)`${param.name}: ${param.type}`
    })
  }}
  `
}

export function compileTODO(node: langium.AstNode, extraInfo?: string): Compiled {
  return compileNode(node)`// TODO: Compile ${node.$type} ${extraInfo ?? ''}`
}

export function compileRefName(ref: AST.Referenceable | langium.Reference<AST.Referenceable>) {
  if (langium.isReference(ref)) {
    ref = ref.ref!
  }
  return compileNodeProperty(ref, 'name') // TODO: .prepend(`${ref.$type}_`)
}
