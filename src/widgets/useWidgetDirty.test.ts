import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useAnyWidgetDirty,
  useIsWidgetDirty,
  useResetWidgets,
  useWidgetDirty,
  useWidgetResetNonce,
} from './useWidgetDirty'
import { useWidgetState } from './useWidgetState'

// The underlying store is intentionally not exported (only these hooks are
// the public surface). Every test below uses its own unique instance ids
// rather than resetting shared state between tests, so tests can't bleed
// into each other regardless of order.

describe('useWidgetDirty / useIsWidgetDirty', () => {
  it('reports dirty status, and reacts to it changing', () => {
    const { result, rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => {
        useWidgetDirty('a', isDirty)
        return useIsWidgetDirty('a')
      },
      { initialProps: { isDirty: false } },
    )

    expect(result.current).toBe(false)

    rerender({ isDirty: true })
    expect(result.current).toBe(true)

    rerender({ isDirty: false })
    expect(result.current).toBe(false)
  })

  it('clears the flag when the reporting widget unmounts', () => {
    const { unmount } = renderHook(() => useWidgetDirty('b', true))
    expect(renderHook(() => useIsWidgetDirty('b')).result.current).toBe(true)

    unmount()

    expect(renderHook(() => useIsWidgetDirty('b')).result.current).toBe(false)
  })

  it('tracks each instance independently', () => {
    renderHook(() => useWidgetDirty('c', true))
    renderHook(() => useWidgetDirty('d', false))

    expect(renderHook(() => useIsWidgetDirty('c')).result.current).toBe(true)
    expect(renderHook(() => useIsWidgetDirty('d')).result.current).toBe(false)
  })
})

describe('useAnyWidgetDirty', () => {
  it('is false when none of the given instances are dirty, true if even one is', () => {
    renderHook(() => useWidgetDirty('e1', true))

    expect(renderHook(() => useAnyWidgetDirty(['e2', 'e3'])).result.current).toBe(false)

    renderHook(() => useWidgetDirty('e2', true))

    expect(renderHook(() => useAnyWidgetDirty(['e2', 'e3'])).result.current).toBe(true)
  })

  it('ignores dirty instances outside the given scope — one dashboard cannot see another', () => {
    renderHook(() => useWidgetDirty('other-dashboard-widget', true))

    expect(renderHook(() => useAnyWidgetDirty(['this-dashboard-widget'])).result.current).toBe(
      false,
    )
  })
})

describe('useResetWidgets — per-instance reset scoping', () => {
  it('bumps the reset nonce only for the requested instances', () => {
    const before1 = renderHook(() => useWidgetResetNonce('f1')).result.current
    const before2 = renderHook(() => useWidgetResetNonce('f2')).result.current
    const { result } = renderHook(() => useResetWidgets())

    act(() => result.current(['f1']))

    expect(renderHook(() => useWidgetResetNonce('f1')).result.current).toBe(before1 + 1)
    expect(renderHook(() => useWidgetResetNonce('f2')).result.current).toBe(before2)
  })

  it('clears the dirty flag only for the requested instances, leaving others untouched', () => {
    renderHook(() => useWidgetDirty('g1', true))
    renderHook(() => useWidgetDirty('g2', true))
    const { result } = renderHook(() => useResetWidgets())

    act(() => result.current(['g1']))

    expect(renderHook(() => useIsWidgetDirty('g1')).result.current).toBe(false)
    expect(renderHook(() => useIsWidgetDirty('g2')).result.current).toBe(true)
  })

  it('also clears useWidgetState content for the requested instances — a fresh mount must not inherit stale values', () => {
    const contentBefore = renderHook(() => useWidgetState('h1', 'input', 'default'))
    act(() => contentBefore.result.current[1]('typed value'))
    const { result } = renderHook(() => useResetWidgets())

    act(() => result.current(['h1']))

    // Simulates the remount the nonce bump forces: a brand new hook call
    // reading the same key should see the store's cleared state, not the
    // value it held a moment ago.
    const contentAfter = renderHook(() => useWidgetState('h1', 'input', 'default'))
    expect(contentAfter.result.current[0]).toBe('default')
  })
})
