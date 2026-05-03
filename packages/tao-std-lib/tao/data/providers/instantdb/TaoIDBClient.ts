import * as IDB from '@instantdb/react-native'

// TaoIDBClient doesn't currently enable toggling sync, but we leave it in for hard-toggling in development.
class TaoIDBClient<
  Schema extends IDB.InstantSchemaDef<any, any, any>,
  UseDates extends boolean,
  Config extends IDB.InstantConfig<Schema, UseDates> = IDB.InstantConfig<Schema, UseDates>,
> extends IDB.InstantReactNativeDatabase<Schema, UseDates, Config> {
  // TODO: Allow for toggling sync on-off at will
  // For now: Uncomment these to prevent the IDB client from syncing
  //   static NetworkListener = class LocalOnlyNetworkListener {
  //       static getIsOnline = async () => false
  //       static listen = ( _f: unknown ) => () => { }
  //   }
}

/** createTaoIDBClient runs a tao-configued InstantDB client, that allows for dev tools like toggling sync at will. */
export function createTaoIDBClient<
  Schema extends IDB.InstantSchemaDef<any, any, any>,
  UseDates extends boolean = false,
>(
  // TODO: This is ugly - why is it needed for valid typechecking?
  config: Omit<IDB.InstantConfig<Schema, UseDates>, 'useDateObjects'> & { useDateObjects?: UseDates },
): TaoIDBClient<Schema, UseDates, IDB.InstantConfig<Schema, UseDates>> {
  return new TaoIDBClient<Schema, UseDates, IDB.InstantConfig<Schema, UseDates>>(
    {
      ReadableStream,
      WritableStream,
      ...config,
      useDateObjects: (config.useDateObjects ?? false) as UseDates,
    },
  )
}
