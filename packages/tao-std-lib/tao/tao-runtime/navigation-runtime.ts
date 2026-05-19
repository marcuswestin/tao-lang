export type TaoNavigationParams = Record<string, unknown>

export type TaoNavigationRootRef = {
  dispatch(action: unknown): void
  isReady(): boolean
}

export type TaoNavigationActionFactories = {
  stackPop(count?: number): unknown
  stackPush(name: string, params: TaoNavigationParams): unknown
  tabJumpTo(name: string, params: TaoNavigationParams): unknown
}

export type TaoNavigationRuntime = {
  pop(count?: number): void
  push(name: string, params?: TaoNavigationParams): void
  tab(name: string, params?: TaoNavigationParams): void
}

/** createTaoNavigationRuntime creates Tao navigation helpers backed by a React Navigation root ref. */
export function createTaoNavigationRuntime(
  rootRef: TaoNavigationRootRef,
  actions: TaoNavigationActionFactories,
): TaoNavigationRuntime {
  return {
    pop(count) {
      dispatchWhenReady(rootRef, actions.stackPop(count))
    },
    push(name, params = {}) {
      dispatchWhenReady(rootRef, actions.stackPush(name, params))
    },
    tab(name, params = {}) {
      dispatchWhenReady(rootRef, actions.tabJumpTo(name, params))
    },
  }
}

function dispatchWhenReady(rootRef: TaoNavigationRootRef, action: unknown): void {
  if (!rootRef.isReady()) {
    throw new Error('Tao navigation action cannot run before the navigation root is ready.')
  }
  rootRef.dispatch(action)
}
