import { AstNode, Properties, Reference } from 'langium'

// assertNever throws an error when called, used for exhaustive type checking
// Example:
//   switch(expr.kind) {
//     case 'a': ...; break;
//     case 'b': ...; break;
//     default: assertNever(expr); // type error if not exhaustive
//   }
export function assertNever<T extends never>(_arg: T): never {
  throw new Error(`assertNever called`)
}

// compileNodeProperty generates code for the given node property, using the generator function if
// provided, otherwise using the property value directly
export function compileNodeProperty<NodeT extends AstNode, PropName extends NodePropName<NodeT>>(
  node: NodeT,
  propertyName: PropName,
  genFn?: (property: NonNullable<NodeT[PropName]>) => LangiumGen.Generated,
): Compiled | undefined {
  const propertyVal = node[propertyName]
  if (propertyVal === undefined || propertyVal === null) {
    return undefined
  }
  const content = genFn ? genFn(propertyVal) : propertyVal
  return compileNode(node, propertyName)`${content}`
}

// compileNodeListProperty generates code for a list property without special formatting
export function compileNodeListProperty<
  NodeT extends AstNode,
  PropName extends {
    [K in NodePropName<NodeT>]: Required<NodeT>[K] extends Iterable<any> ? K : never
  }[NodePropName<NodeT>],
>(
  node: NodeT | undefined,
  propertyName: PropName,
  compileListItemFn: CompileListItemFn<ItemOfIterable<Required<NodeT[PropName]>>>,
): Compiled | undefined {
  if (!node) {
    return undefined
  }
  if (!node[propertyName]) {
    return undefined
  }
  return _compileNodeListProperty(node, propertyName, compileListItemFn, { appendNewLineIfNotEmpty: true })
}

export type NodePropName<N extends AstNode> = keyof Omit<N, keyof AstNode | number | symbol>

import * as LangiumGen from 'langium/generate'
export type Compiled = LangiumGen.CompositeGeneratorNode | undefined

type CompileListItemFn<ItemT extends any> = (
  element: ItemT,
  index: number,
  isLast: boolean,
) => Compiled

type ItemOfIterable<T> = T extends Iterable<infer U> ? U : never

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

// genNode returns a template tag function that generates code traced to the given AST node
export function compileNode<T extends AstNode>(
  astNode: T,
  property?: Properties<T>,
): (
  staticParts: TemplateStringsArray,
  ...substitutions: unknown[]
) => Compiled {
  return LangiumGen.expandTracedToNode(astNode, property)
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

export function compileList<NodeT extends AstNode, ItemT>(
  astNode: NodeT,
  items: Iterable<ItemT>,
  genListItemFn: GenListItemFn<ItemT>,
  options?: LangiumGen.JoinOptions<ItemT>,
): Compiled {
  return LangiumGen.joinTracedToNode(astNode)<ItemT>(items, genListItemFn, options)
}
type GenListItemFn<ItemT extends any> = (
  element: ItemT,
  index: number,
  isLast: boolean,
) => LangiumGen.Generated

// genNodePropertyRef resolves the reference property and
// generates code using the resolved target node.
export function genNodePropertyRef<
  NodeT extends AstNode,
  PropName extends _NodeRefPropName<NodeT>,
  PropVal extends _NodeRefTarget<NodeT, PropName>,
>(
  node: NodeT,
  propName: PropName,
  genFn: (resolved: PropVal) => Compiled,
): Compiled {
  const ref = node[propName] as Reference<_NodeRefTarget<NodeT, PropName>>
  return ref ? genFn(ref.ref as PropVal) : undefined
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
