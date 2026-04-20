type ItemHandlerMap<U extends { $type: PropertyKey }, R> = {
  [K in U['$type']]: (item: Extract<U, { $type: K }>) => R
}

type PropertyHandlerFn<ItemT, PropertyName extends keyof ItemT, R> = (v: ItemT[PropertyName]) => R

type PropertyHandlerMapKey<ItemT, PropertyName extends keyof ItemT, R> = keyof PropertyValueHandlerMap<
  ItemT,
  PropertyName,
  R
>

// Maps each possible value of item[property] to a handler; enforces exhaustive handling.
// Uses Exclude so undefined is not used as a mapped key (invalid in TS); optional undefined key added when property is optional.
type PropertyValueHandlerMap<ItemT, PropertyName extends keyof ItemT, R> = ItemT[PropertyName] extends infer V ?
    & { [K in Exclude<V, undefined> & (string | number | symbol)]: (value: K) => R }
    & (undefined extends V ? { undefined: (value: undefined) => R } : {})
  : never

/** switchType_Exhaustive dispatches on `item.$type`; TypeScript enforces a handler per discriminant. At runtime a missing
 * key still throws when invoked—keep handlers in sync with the AST union. */
function switchType_Exhaustive<
  ItemT extends { $type: PropertyKey },
  R,
>(item: ItemT, handlers: ItemHandlerMap<ItemT, R>): R {
  const key = item.$type as keyof ItemHandlerMap<ItemT, R>
  return handlers[key](item as Extract<ItemT, { $type: typeof key }>)
}

/** switchProperty_Exhaustive dispatches on `item[property]` with an exhaustive map per possible value (including `undefined`
 * when the property is optional). Runtime values outside the map yield `undefined` handlers—callers should ensure coverage. */
function switchProperty_Exhaustive<
  ItemT extends {},
  PropertyName extends keyof ItemT,
  R,
>(item: ItemT, property: PropertyName, handlers: PropertyValueHandlerMap<ItemT, PropertyName, R>): R {
  const value = item[property]
  const fn = handlers[value as PropertyHandlerMapKey<ItemT, PropertyName, R>]
  return (fn as PropertyHandlerFn<ItemT, PropertyName, R>)(value)
}

/** switchBindItemType_Exhaustive is like `switchType_Exhaustive` but calls each handler with `bindThis` as `this`. */
function switchBindItemType_Exhaustive<
  ItemT extends { $type: PropertyKey },
  R,
>(item: ItemT, bindThis: ThisType<ItemT>, handlers: ItemHandlerMap<ItemT, R>): R {
  const key = item.$type as keyof ItemHandlerMap<ItemT, R>
  return handlers[key].bind(bindThis)(item as Extract<ItemT, { $type: typeof key }>)
}

/** switch_Exhaustive returns `handlers[value](value)` for a discriminated `value` with exhaustive `handlers` keys. */
function switch_Exhaustive<T extends string | number | symbol, ResultT>(
  value: T,
  handlers: { [K in T]: (value: K) => ResultT },
): ResultT {
  return handlers[value](value)
}

export type switch_safe = typeof switch_Exhaustive & {
  type: typeof switchType_Exhaustive
  property: typeof switchProperty_Exhaustive
  bind: typeof switchBindItemType_Exhaustive
}

/** switch_safe groups exhaustive switch helpers: `type` (on `$type`), `property` (on a field), and `bind` (type + bound `this`). */
export const switch_safe = Object.assign(switch_Exhaustive, {
  type: switchType_Exhaustive,
  property: switchProperty_Exhaustive,
  bind: switchBindItemType_Exhaustive,
})
