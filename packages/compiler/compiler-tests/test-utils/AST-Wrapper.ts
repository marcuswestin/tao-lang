import { AstNode, Reference } from 'langium'
import { expect } from './test-harness'

// Exported
///////////

// wrap creates a proxy-based wrapper enabling type-safe AST traversal
export function wrap<T extends AstNode>(node: T): Wrapped<T> {
  const methods = {
    expect(key: string) {
      return expect((node as Record<string, unknown>)[key])
    },
    unwrap() {
      return node
    },
  }

  return new Proxy(methods as unknown as Wrapped<T>, {
    get(target, prop) {
      // Skip symbols (internal JS properties like Symbol.iterator)
      if (typeof prop === 'symbol') {
        return undefined
      }

      // Handle methods on wrapper object (e.g. 'expect', 'unwrap')
      if (prop in target) {
        const value = (target as Record<string, unknown>)[prop]
        return typeof value === 'function' ? value.bind(target) : value
      }

      // .as_<TypeName> narrows union types
      if (typeof prop === 'string' && prop.startsWith('as_')) {
        expect(node.$type).toBe(prop.slice(3))
        return wrap(node)
      }

      const child = (node as Record<string, unknown>)[prop]

      if (prop === 'then' && child === undefined) {
        return undefined
      }

      // Assert property exists (handles optional properties)
      expect(child, `Property '${String(prop)}' is undefined`).toBeDefined()

      // Wrap AstNode children
      if (child !== null && typeof child === 'object' && '$type' in child) {
        return wrap(child as AstNode)
      }

      // Auto-dereference Reference<AstNode> properties
      if (child !== null && typeof child === 'object' && 'ref' in child) {
        const ref = child as Reference<AstNode>
        expect(ref.ref, `Reference '${String(prop)}' is unresolved`).toBeDefined()
        return wrap(ref.ref!)
      }

      // Wrap arrays of AstNodes
      if (Array.isArray(child)) {
        return wrapArray(child)
      }

      return child
    },
  })
}

// Wrap an element lazily (only if it's an AstNode)
function wrapElement(el: unknown): unknown {
  return el && typeof el === 'object' && '$type' in el ? wrap(el as AstNode) : el
}

// wrapArray adds convenience accessors and wraps elements lazily on access
function wrapArray<T>(array: unknown[]): WrappedArray<T> {
  return new Proxy(array as WrappedArray<T>, {
    get(target, prop) {
      switch (prop) {
        case 'first':
          expect(target[0], `Array is empty, cannot get .first`).toBeDefined()
          return wrapElement(target[0])
        case 'second':
          expect(target[1], `Array has less than 2 elements, cannot get .second`).toBeDefined()
          return wrapElement(target[1])
        case 'last':
          expect(target.length > 0, `Array is empty, cannot get .last`).toBe(true)
          return wrapElement(target[target.length - 1])
        default: {
          // Wrap numeric index access lazily
          const index = typeof prop === 'string' ? Number(prop) : NaN
          if (!Number.isNaN(index) && Number.isInteger(index)) {
            return wrapElement(target[index])
          }
          return (target as unknown as Record<string | symbol, unknown>)[prop]
        }
      }
    },
  })
}

// Private types
////////////////

type ExtractByType<T, TypeName extends string> = T extends { $type: TypeName } ? T : never
type TypeNames<T> = T extends { $type: infer U extends string } ? U : never
type OwnKeys<T> = Exclude<keyof T, keyof AstNode>

// IsUnion detects if T is a union type (e.g. A | B) vs a single type
// This correctly distinguishes:
// - `ActionBody` (single interface with $type union) -> false
// - `AppDeclaration | ViewDeclaration` (true union type) -> true
type IsUnion<T, U = T> = T extends T ? ([U] extends [T] ? false : true) : never
type IsSingleType<T> = IsUnion<T> extends true ? false : true

// WrappedArray adds .first and .last accessors to arrays
type WrappedArray<T> = T[] & {
  readonly first: T
  readonly second: T
  readonly last: T
}

// WrappedProp strips undefined (optional props are asserted at runtime) then wraps
type WrappedProp<T> = WrappedPropInner<NonNullable<T>>
type WrappedPropInner<T> = [T] extends [AstNode] ? Wrapped<T>
  : T extends Reference<infer R extends AstNode> ? Wrapped<R>
  : T extends readonly (infer E)[] ? [E] extends [AstNode] ? WrappedArray<Wrapped<E>> : T
  : T

type WrappedProps<T extends AstNode> = { readonly [K in OwnKeys<T>]: WrappedProp<T[K]> }

type AsGetters<T extends AstNode> = {
  readonly [TypeName in TypeNames<T> as `as_${TypeName}`]: Wrapped<ExtractByType<T, TypeName>>
}

type Expectation<T> = ReturnType<typeof expect<T>>

export type Wrapped<T extends AstNode> =
  & (IsSingleType<T> extends true ? {
      expect<K extends OwnKeys<T>>(key: K): Expectation<T[K]>
      unwrap(): T
    } & WrappedProps<T>
    : AsGetters<T>)
  & {}
