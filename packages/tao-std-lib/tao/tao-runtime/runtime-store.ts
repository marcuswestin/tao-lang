import { Observable } from '@legendapp/state'
import { useValue } from '@legendapp/state/react'

export const useStore = function useLegendAppState<T>(state$: Observable<T>) {
  return {
    useState: () => {
      const value = useValue(state$)
      return {
        read: () => value,
        update: (fn: (val: T) => T) => {
          // narrow the union to the value with `.set` for strict TS
          const typed$ = state$ as { set(v: T): void }
          typed$.set(fn(value))
        },
      }
    },
  }
}
