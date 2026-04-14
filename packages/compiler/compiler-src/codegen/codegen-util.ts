import { AST, LGM } from '@parser'
import { Assert } from '@shared/TaoErrors'

import * as LangiumGen from '@parser/generate'
import { Iterable, Stream } from '@shared'

export type Compiled = LangiumGen.CompositeGeneratorNode
export const CompositeGeneratorNode = LangiumGen.CompositeGeneratorNode

export type Generated = LangiumGen.Generated
export type GeneratorNode = LangiumGen.GeneratorNode

type NonNullablePropName<N extends AST.Node> = {
  [K in AST.NodePropName<N>]: undefined extends N[K] ? never : null extends N[K] ? never : K
}[AST.NodePropName<N>]

/** compileNodeProperty emits traced code for one AST property with an optional per-value generator. */
export function compileNodeProperty<NodeT extends AST.Node, PropName extends NonNullablePropName<NodeT>>(
  node: NodeT,
  propertyName: PropName,
  genFn?: (property: NodeT[PropName]) => Generated,
  // ): Compiled | undefined {
): Compiled {
  const propertyVal = node[propertyName]
  // if (propertyVal === undefined || propertyVal === null) {
  //   return undefined
  // }
  const content = genFn ? genFn(propertyVal) : propertyVal
  return compileNode(node, propertyName)`${content}`
}

/** compileNodeListProperty emits traced code for an array property with a per-item generator. */
export function compileNodeListProperty<
  NodeT extends AST.Node,
  PropName extends {
    [K in AST.NodePropName<NodeT>]: Required<NodeT>[K] extends Iterable<any> ? K : never
  }[AST.NodePropName<NodeT>],
>(
  node: NodeT,
  propertyName: PropName,
  compileListItemFn: CompileListItemFn<ItemOfIterable<NonNullable<NodeT[PropName]>>>,
): Compiled {
  Assert(node[propertyName], 'Node and property must be defined')
  return compileNodeListPropertyOptional(node, propertyName, compileListItemFn)!
}

/** compileNodeListPropertyOptional emits traced code for an array property with a per-item generator,
 *  or undefined when the node or the iterable property is missing.
 */
export function compileNodeListPropertyOptional<
  NodeT extends AST.Node,
  PropName extends {
    [K in AST.NodePropName<NodeT>]: Required<NodeT>[K] extends Iterable<any> ? K : never
  }[AST.NodePropName<NodeT>],
>(
  node: NodeT | undefined,
  propertyName: PropName,
  compileListItemFn: CompileListItemFn<ItemOfIterable<NonNullable<NodeT[PropName]>>>,
): Compiled | undefined {
  if (!node || node[propertyName] == undefined) {
    return undefined
  }
  return _compileNodeListProperty(node, propertyName, compileListItemFn, {
    prefix: new LangiumGen.NewLineNode(),
  })
}

export function compileNoop(): Compiled {
  return new LangiumGen.CompositeGeneratorNode()
}

type CompileListItemFn<ItemT extends any> = (
  element: ItemT,
  index: number,
  isLast: boolean,
) => Compiled

type ItemOfIterable<T> = T extends Iterable<infer U> ? U : never

/** _compileNodeListProperty joins list items with tracing to the owning node. */
function _compileNodeListProperty<
  NodeT extends AST.Node,
  PropName extends AST.NodePropName<NodeT>,
  PropVal extends Iterable<ItemT> & NodeT[PropName],
  ItemT,
>(
  node: NodeT,
  propertyName: AST.NodePropName<NodeT>,
  compileListItemFn: CompileListItemFn<ItemT>,
  options: LangiumGen.JoinOptions<ItemT>,
): Compiled {
  assert(Array.isArray(node[propertyName]), 'Property is not an array ')
  const property = node[propertyName] as PropVal
  return LangiumGen.joinTracedToNode<NodeT>(node, propertyName)(property, compileListItemFn, options)
}

/** compileNode returns a template tag that expands code traced to the given AST node. */
export function compileNode<T extends AST.Node>(
  astNode: T,
  property?: LGM.Properties<T>,
): (
  staticParts: TemplateStringsArray,
  ...substitutions: unknown[]
) => Compiled {
  return LangiumGen.expandTracedToNode(astNode, property)
}

/** assert throws if condition is false (internal compiler-codegen check). */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

/** compileNodeList joins arbitrary iterable nodes with tracing to a composite generator node. */
export function compileNodeList<NodeT extends AST.Node>(
  nodes: Iterable<NodeT> | Generator<NodeT, void, unknown> | Stream<NodeT>,
  genListItemFn: (node: NodeT) => LangiumGen.Generated,
): Compiled {
  const compiledList = new LangiumGen.CompositeGeneratorNode()
  for (const node of Iterable.from(nodes)) {
    const compiledNode = LangiumGen.expandTracedToNode(node)`${genListItemFn(node)}`
    compiledList.append(compiledNode).appendNewLineIfNotEmpty()
  }
  return compiledList
}

/** compileNodePropertyRef resolves a reference property and emits code from the target. */
export function compileNodePropertyRef<
  NodeT extends AST.Node,
  PropName extends _NodeRefPropName<NodeT>,
  PropVal extends _NodeRefTarget<NodeT, PropName>,
>(
  node: NodeT,
  propName: PropName,
  genFn: (resolved: PropVal) => Compiled,
): Compiled {
  const ref = node[propName] as LGM.Reference<_NodeRefTarget<NodeT, PropName>>
  return ref ? genFn(ref.ref as PropVal) : compileNoop()
}

type _NodeRefPropName<NodeT extends AST.Node> = Extract<
  AST.NodePropName<NodeT>,
  {
    [K in keyof NodeT]: NodeT[K] extends { ref: any } ? K : never
  }[keyof NodeT]
>

type _NodeRefTarget<
  NodeT extends AST.Node,
  PropName extends _NodeRefPropName<NodeT>,
> = NodeT[PropName] extends LGM.Reference<infer T> ? T
  : NodeT[PropName] extends { ref: LGM.Reference<infer T> } ? T
  : never
export function compileTODO(node: AST.Node, extraInfo?: string): Compiled {
  return compileNode(node)`// TODO: Compile ${node.$type} ${extraInfo ?? ''}`
}
