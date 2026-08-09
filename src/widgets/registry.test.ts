import { describe, expect, it } from 'vitest'
import { getWidgetDefinition, WIDGET_LIST, WIDGET_REGISTRY } from './registry'

describe('widget registry', () => {
  it('is not empty', () => {
    expect(WIDGET_LIST.length).toBeGreaterThan(0)
  })

  it('gives every widget a unique id', () => {
    const ids = WIDGET_LIST.map((widget) => widget.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves every widget by its own id', () => {
    for (const widget of WIDGET_LIST) {
      expect(getWidgetDefinition(widget.id)).toBe(widget)
    }
  })

  it('returns undefined for an id that was never registered', () => {
    expect(getWidgetDefinition('does-not-exist')).toBeUndefined()
  })

  it('keeps WIDGET_REGISTRY and WIDGET_LIST in sync', () => {
    expect(Object.keys(WIDGET_REGISTRY).sort()).toEqual(
      WIDGET_LIST.map((widget) => widget.id).sort(),
    )
  })

  it('gives every widget a lazy-loadable component and a sane default size', () => {
    for (const widget of WIDGET_LIST) {
      expect(widget.component).toBeTruthy()
      expect(widget.defaultSize.w).toBeGreaterThan(0)
      expect(widget.defaultSize.h).toBeGreaterThan(0)
      expect(widget.name.length).toBeGreaterThan(0)
    }
  })
})
