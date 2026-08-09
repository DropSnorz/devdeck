import { describe, expect, it } from 'vitest'
import type { Dashboard } from '@/types/layout'
import { decodeWorkspace } from './layoutCodec'
import { buildShareUrl } from './shareUrl'

const DASHBOARDS: Dashboard[] = [
  {
    id: 'dash-a',
    name: 'Dash A',
    widgets: [{ instanceId: 'a', widgetId: 'uuid-generator', x: 0, y: 0, w: 2, h: 2 }],
  },
  { id: 'dash-b', name: 'Dash B', widgets: [] },
]

describe('buildShareUrl', () => {
  it('puts the workspace in the URL fragment, not a query param', () => {
    const shareUrl = buildShareUrl(DASHBOARDS, 'dash-a')
    const url = new URL(shareUrl)

    expect(url.search).toBe('')
    expect(url.hash).toMatch(/^#layout=/)
  })

  it('round-trips through the fragment back to the original dashboards and active id', () => {
    const url = new URL(buildShareUrl(DASHBOARDS, 'dash-b'))
    const encoded = new URLSearchParams(url.hash.slice(1)).get('layout')

    expect(encoded).toBeTruthy()
    const result = decodeWorkspace(encoded ?? '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.workspace.dashboards).toEqual(DASHBOARDS)
      expect(result.workspace.activeDashboardId).toBe('dash-b')
    }
  })
})
