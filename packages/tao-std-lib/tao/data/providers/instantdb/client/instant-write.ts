/** instantStrictUpdateOptions forces InstantDB update mutations to fail instead of upserting missing rows. */
export const instantStrictUpdateOptions = { upsert: false } as const
