import { describe, expect, it } from 'vitest'
import LZString from 'lz-string'
import type { DashboardWidgetInstance } from '@/types/layout'
import { decodeLayout, encodeLayout } from './layoutCodec'

const WIDGETS: DashboardWidgetInstance[] = [
  { instanceId: 'a', widgetId: 'uuid-generator', x: 0, y: 0, w: 2, h: 2 },
  { instanceId: 'b', widgetId: 'json-formatter', x: 2, y: 0, w: 4, h: 4 },
]

describe('layoutCodec', () => {
  it('round-trips a layout through encode/decode unchanged', () => {
    const result = decodeLayout(encodeLayout(WIDGETS))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.layout.widgets).toEqual(WIDGETS)
      expect(result.layout.version).toBe(1)
    }
  })

  it('silently drops instances referencing an unknown widget id', () => {
    const withUnknown = [
      ...WIDGETS,
      {
        instanceId: 'c',
        widgetId: 'not-a-real-widget',
        x: 0,
        y: 4,
        w: 2,
        h: 2,
      },
    ]
    const result = decodeLayout(encodeLayout(withUnknown))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.layout.widgets.map((w) => w.instanceId)).toEqual(['a', 'b'])
    }
  })

  it('rejects undecompressable garbage without throwing', () => {
    const result = decodeLayout('%%%not-a-valid-lz-string%%%')
    expect(result.ok).toBe(false)
  })

  it('rejects a payload with the wrong schema shape', () => {
    const encoded = LZString.compressToEncodedURIComponent(
      JSON.stringify({ version: 1, widgets: 'not-an-array' }),
    )
    const result = decodeLayout(encoded)
    expect(result.ok).toBe(false)
  })

  it('rejects a payload with an unsupported version', () => {
    const encoded = LZString.compressToEncodedURIComponent(
      JSON.stringify({ version: 2, widgets: [] }),
    )
    const result = decodeLayout(encoded)
    expect(result.ok).toBe(false)
  })

  it('rejects valid JSON that is not layout-shaped at all', () => {
    const encoded = LZString.compressToEncodedURIComponent(
      JSON.stringify({ hello: 'world' }),
    )
    const result = decodeLayout(encoded)
    expect(result.ok).toBe(false)
  })
})
