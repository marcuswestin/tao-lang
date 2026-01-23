type HandlerMap<U extends { $type: PropertyKey }, R> = {
  [K in U['$type']]: (item: Extract<U, { $type: K }>) => R
}

export function switchItemType_Exhaustive<
  ItemT extends { $type: PropertyKey },
  R,
>(item: ItemT, handlers: HandlerMap<ItemT, R>): R {
  const key = item.$type as keyof HandlerMap<ItemT, R>
  return handlers[key](item as Extract<ItemT, { $type: typeof key }>)
}

export function switch_Exhaustive<
  ItemT extends { $type: PropertyKey },
  R,
>(item: ItemT, handlers: HandlerMap<ItemT, R>): R {
  const key = item.$type as keyof HandlerMap<ItemT, R>
  return handlers[key](item as Extract<ItemT, { $type: typeof key }>)
}

export function switchBindItemType_Exhaustive<
  ItemT extends { $type: PropertyKey },
  R,
>(item: ItemT, bindThis: ThisType<ItemT>, handlers: HandlerMap<ItemT, R>): R {
  const key = item.$type as keyof HandlerMap<ItemT, R>
  return handlers[key].bind(bindThis)(item as Extract<ItemT, { $type: typeof key }>)
}
