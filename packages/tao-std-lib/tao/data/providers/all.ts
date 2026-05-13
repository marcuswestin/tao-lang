/** Re-exports runtime data client contracts, query helpers, and provider client implementations. Admin-only modules stay on direct subpath imports outside generated apps. */
import { registerTaoDataProvider, type TaoDataClient } from './tao-data-client'

export { MemoryTaoData } from './in-memory/client/in-memory'
export * from './tao-data-client'
export {
  buildQueryResult,
  evaluateQueryPlan,
  evaluateQueryValue,
  taoQueryIdentity,
  useReactiveQueryPlan,
} from './tao-query'

declare const require: (id: string) => unknown

type InstantDBClientModule = {
  InstantDBTaoClient: new() => TaoDataClient
}

registerTaoDataProvider('InstantDB', () => {
  const mod = require('./instantdb/client/InstantDBTaoClient') as InstantDBClientModule
  return new mod.InstantDBTaoClient()
})
