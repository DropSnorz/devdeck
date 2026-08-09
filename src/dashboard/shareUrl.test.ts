import { describe, expect, it } from 'vitest'
import type { DashboardWidgetInstance } from '@/types/layout'
import { decodeLayout } from './layoutCodec'
import { buildShareUrl } from './shareUrl'

const WIDGETS: DashboardWidgetInstance[] = [
  { instanceId: 'a', widgetId: 'uuid-generator', x: 0, y: 0, w: 2, h: 2 },
]

describe('buildShareUrl', () => {
  it('puts the layout in the URL fragment, not a query param', () => {
    const shareUrl = buildShareUrl(WIDGETS)
    const url = new URL(shareUrl)

    expect(url.search).toBe('')
    expect(url.hash).toMatch(/^#layout=/)
  })

  it('round-trips through the fragment back to the original widgets', () => {
    const url = new URL(buildShareUrl(WIDGETS))
    const encoded = new URLSearchParams(url.hash.slice(1)).get('layout')

    expect(encoded).toBeTruthy()
    const result = decodeLayout(encoded ?? '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.layout.widgets).toEqual(WIDGETS)
    }
  })
})
