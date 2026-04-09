import { NodePropName } from '@parser'
import { Assert } from '@shared/TaoErrors'
import { AstNode, Properties, Reference } from 'langium'

export type { NodePropName }

/** assertNever throws at runtime when reached; use as exhaustive switch default so missing cases are a type error.
 * - Example: `default: assertNever(expr)`. */
export function assertNever<T extends never>(_arg: T): never {
  throw new Error(`assertNever called`)
}

type NonNullablePropName<N extends AstNode> = {
  [K in NodePropName<N>]: undefined extends N[K] ? never : null extends N[K] ? never : K
}[NodePropName<N>]

/** compileNodeProperty emits traced code for one AST property with an optional per-value generator. */
export function compileNodeProperty<NodeT extends AstNode, PropName extends NonNullablePropName<NodeT>>(
  node: NodeT,
  propertyName: PropName,
  genFn?: (property: NodeT[PropName]) => LangiumGen.Generated,
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
  NodeT extends AstNode,
  PropName extends {
    [K in NodePropName<NodeT>]: Required<NodeT>[K] extends Iterable<any> ? K : never
  }[NodePropName<NodeT>],
>(
  node: NodeT,
  propertyName: PropName,
  compileListItemFn: CompileListItemFn<ItemOfIterable<Required<NodeT[PropName]>>>,
): Compiled {
  Assert(node[propertyName], 'Node and property must be defined')
  return _compileNodeListProperty(node, propertyName, compileListItemFn, { appendNewLineIfNotEmpty: true })
}

import * as LangiumGen from 'langium/generate'
export type Compiled = LangiumGen.CompositeGeneratorNode

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
  NodeT extends AstNode,
  PropName extends NodePropName<NodeT>,
  PropVal extends Iterable<ItemT> & NodeT[PropName],
  ItemT,
>(
  node: NodeT,
  propertyName: NodePropName<NodeT>,
  compileListItemFn: CompileListItemFn<ItemT>,
  options: LangiumGen.JoinOptions<ItemT>,
): Compiled {
  assert(Array.isArray(node[propertyName]), 'Property is not an array ')
  const property = node[propertyName] as PropVal
  return LangiumGen.joinTracedToNode<NodeT>(node, propertyName)(property, compileListItemFn, options)
}

/** compileNode returns a template tag that expands code traced to the given AST node. */
export function compileNode<T extends AstNode>(
  astNode: T,
  property?: Properties<T>,
): (
  staticParts: TemplateStringsArray,
  ...substitutions: unknown[]
) => Compiled {
  return LangiumGen.expandTracedToNode(astNode, property)
}

/** assert throws if condition is false (internal compiler-utils check). */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

/** compileNodeList joins arbitrary iterable nodes with tracing to a composite generator node. */
export function compileNodeList<NodeT extends AstNode>(
  nodes: Iterable<NodeT>,
  genListItemFn: (node: NodeT) => LangiumGen.Generated,
): Compiled {
  const compiledList = new LangiumGen.CompositeGeneratorNode()
  for (const node of nodes) {
    const compiledNode = LangiumGen.expandTracedToNode(node)`${genListItemFn(node)}`
    compiledList.append(compiledNode).appendNewLineIfNotEmpty()
  }
  return compiledList
}

/** compileNodePropertyRef resolves a reference property and emits code from the target. */
export function compileNodePropertyRef<
  NodeT extends AstNode,
  PropName extends _NodeRefPropName<NodeT>,
  PropVal extends _NodeRefTarget<NodeT, PropName>,
>(
  node: NodeT,
  propName: PropName,
  genFn: (resolved: PropVal) => Compiled,
): Compiled {
  const ref = node[propName] as Reference<_NodeRefTarget<NodeT, PropName>>
  return ref ? genFn(ref.ref as PropVal) : compileNoop()
}

type _NodeRefPropName<NodeT extends AstNode> = Extract<
  NodePropName<NodeT>,
  {
    [K in keyof NodeT]: NodeT[K] extends { ref: any } ? K : never
  }[keyof NodeT]
>

type _NodeRefTarget<
  NodeT extends AstNode,
  PropName extends _NodeRefPropName<NodeT>,
> = NodeT[PropName] extends Reference<infer T> ? T
  : NodeT[PropName] extends { ref: Reference<infer T> } ? T
  : never
// Node List Property Generator functions
/////////////////////////////////////////
