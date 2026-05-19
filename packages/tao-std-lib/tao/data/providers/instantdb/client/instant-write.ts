/** instantStrictUpdateOptions forces InstantDB update mutations to fail instead of upserting missing rows. */
export const instantStrictUpdateOptions = { upsert: false } as const

type InstantWriteDb = {
  tx: Record<string, Record<string, { update: (payload: Record<string, unknown>, options?: unknown) => unknown }>>
}

/** instantInsertChunk builds the InstantDB upsert-style chunk used for Tao `create`. */
export function instantInsertChunk(
  db: InstantWriteDb,
  collection: string,
  rowId: string,
  payload: Record<string, unknown>,
): unknown {
  return db.tx[collection]![rowId]!.update(payload)
}

/** instantStrictUpdateChunk builds the InstantDB strict update chunk used for Tao row-handle `update`. */
export function instantStrictUpdateChunk(
  db: InstantWriteDb,
  collection: string,
  rowId: string,
  payload: Record<string, unknown>,
): unknown {
  return db.tx[collection]![rowId]!.update(payload, instantStrictUpdateOptions)
}
