import { describe, expect, test } from 'bun:test'
import {
  createTaoNavigationRuntime,
  type TaoNavigationActionFactories,
  type TaoNavigationRootRef,
} from '../tao/tao-runtime/navigation-runtime'

type FakeNavigationRef = TaoNavigationRootRef & {
  dispatched: unknown[]
  ready: boolean
}

function fakeNavigationRef(ready: boolean): FakeNavigationRef {
  return {
    dispatched: [],
    ready,
    dispatch(action) {
      this.dispatched.push(action)
    },
    isReady() {
      return this.ready
    },
  }
}

const fakeActions: TaoNavigationActionFactories = {
  stackPop: (count) => ({ count, type: 'stack-pop' }),
  stackPush: (name, params) => ({ name, params, type: 'stack-push' }),
  tabJumpTo: (name, params) => ({ name, params, type: 'tab-jump-to' }),
}

describe('tao navigation runtime:', () => {
  test('fails clearly before the navigation root is ready', () => {
    const ref = fakeNavigationRef(false)
    const runtime = createTaoNavigationRuntime(ref, fakeActions)

    expect(() => runtime.push('Room', { RoomId: 'room-1' })).toThrow(
      'Tao navigation action cannot run before the navigation root is ready.',
    )
    expect(ref.dispatched).toEqual([])
  })

  test('dispatches stack and tab actions with primitive params', () => {
    const ref = fakeNavigationRef(true)
    const runtime = createTaoNavigationRuntime(ref, fakeActions)

    runtime.push('Room', { Count: 2, RoomId: 'room-1' })
    runtime.pop()
    runtime.tab('Search', { Query: 'paint' })

    expect(ref.dispatched).toEqual([
      { name: 'Room', params: { Count: 2, RoomId: 'room-1' }, type: 'stack-push' },
      { count: undefined, type: 'stack-pop' },
      { name: 'Search', params: { Query: 'paint' }, type: 'tab-jump-to' },
    ])
  })
})
