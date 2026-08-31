import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Dashboard } from '@/types/layout'
import { encodeWorkspace } from './layoutCodec'
import { useShareLinkBootstrap } from './useShareLinkBootstrap'

const DASHBOARDS: Dashboard[] = [
  {
    id: 'dash-a',
    name: 'Dash A',
    widgets: [{ instanceId: 'a', widgetId: 'base64', x: 0, y: 0, w: 2, h: 2 }],
  },
]

describe('useShareLinkBootstrap', () => {
  it('reads a pending workspace from the URL fragment, and clears the fragment once read', () => {
    window.location.hash = `layout=${encodeWorkspace(DASHBOARDS, 'dash-a')}`

    const { result } = renderHook(() => useShareLinkBootstrap())

    // instanceId isn't carried over the wire — see layoutCodec.ts — so the
    // decoded widget gets a freshly minted one rather than the original 'a'.
    expect(result.current.pendingWorkspace?.dashboards).toMatchObject([
      { id: 'dash-a', name: 'Dash A', widgets: [{ widgetId: 'base64', x: 0, y: 0, w: 2, h: 2 }] },
    ])
    expect(result.current.pendingWorkspace?.activeDashboardId).toBe('dash-a')
    // Never left sitting in the URL — matches the query-param behavior this
    // replaces, just off window.location.hash instead of .search now.
    expect(window.location.hash).toBe('')
  })

  it('dismiss() clears the pending workspace', () => {
    window.location.hash = `layout=${encodeWorkspace(DASHBOARDS, 'dash-a')}`
    const { result } = renderHook(() => useShareLinkBootstrap())

    act(() => result.current.dismiss())

    expect(result.current.pendingWorkspace).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('leaves pendingWorkspace null when there is no fragment at all', () => {
    window.location.hash = ''

    const { result } = renderHook(() => useShareLinkBootstrap())

    expect(result.current.pendingWorkspace).toBeNull()
    expect(result.current.decodeError).toBeNull()
  })

  it('surfaces a decode error for a corrupted fragment, without throwing', () => {
    window.location.hash = 'layout=%%%not-valid%%%'

    const { result } = renderHook(() => useShareLinkBootstrap())

    expect(result.current.pendingWorkspace).toBeNull()
    expect(result.current.decodeError).toBeTruthy()
    expect(window.location.hash).toBe('')
  })
})
