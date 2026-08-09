import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useAnyWidgetDirty,
  useIsWidgetDirty,
  useResetAllWidgets,
  useWidgetDirty,
  useWidgetResetGeneration,
} from './useWidgetDirty'

// The underlying store is intentionally not exported (only these hooks are
// the public surface) — reset it between tests via the same "Clear state"
// action the header button uses, rather than reaching into internals.
beforeEach(() => {
  const { result } = renderHook(() => useResetAllWidgets())
  act(() => result.current())
})

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
  it('is false when nothing is dirty, true if even one instance is', () => {
    expect(renderHook(() => useAnyWidgetDirty()).result.current).toBe(false)

    renderHook(() => useWidgetDirty('e', true))

    expect(renderHook(() => useAnyWidgetDirty()).result.current).toBe(true)
  })
})

describe('resetAll (useResetAllWidgets)', () => {
  it('bumps the reset generation', () => {
    const before = renderHook(() => useWidgetResetGeneration()).result.current
    const { result } = renderHook(() => useResetAllWidgets())

    act(() => result.current())

    expect(renderHook(() => useWidgetResetGeneration()).result.current).toBe(
      before + 1,
    )
  })

  it('eagerly clears every dirty flag, not just the ones that get remounted', () => {
    renderHook(() => useWidgetDirty('f', true))
    renderHook(() => useWidgetDirty('g', true))
    expect(renderHook(() => useAnyWidgetDirty()).result.current).toBe(true)

    const { result } = renderHook(() => useResetAllWidgets())
    act(() => result.current())

    expect(renderHook(() => useIsWidgetDirty('f')).result.current).toBe(false)
    expect(renderHook(() => useIsWidgetDirty('g')).result.current).toBe(false)
    expect(renderHook(() => useAnyWidgetDirty()).result.current).toBe(false)
  })
})
