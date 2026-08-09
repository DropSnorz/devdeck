import { describe, expect, it } from 'vitest'
import { WIDGET_LIST } from './registry'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupWidgetsByCategory,
} from './categories'

describe('groupWidgetsByCategory', () => {
  it('accounts for every widget exactly once', () => {
    const groups = groupWidgetsByCategory()
    const grouped = groups.flatMap((group) => group.widgets)
    expect(grouped).toHaveLength(WIDGET_LIST.length)
    expect(new Set(grouped.map((w) => w.id)).size).toBe(WIDGET_LIST.length)
  })

  it('only emits categories that actually have widgets, in CATEGORY_ORDER', () => {
    const groups = groupWidgetsByCategory()
    const orderedNonEmpty = CATEGORY_ORDER.filter((category) =>
      WIDGET_LIST.some((widget) => widget.category === category),
    )
    expect(groups.map((group) => group.category)).toEqual(orderedNonEmpty)
  })

  it('gives every group a human-readable label matching CATEGORY_LABELS', () => {
    for (const group of groupWidgetsByCategory()) {
      expect(group.label).toBe(CATEGORY_LABELS[group.category])
    }
  })

  it('every widget in a group actually belongs to that category', () => {
    for (const group of groupWidgetsByCategory()) {
      for (const widget of group.widgets) {
        expect(widget.category).toBe(group.category)
      }
    }
  })

  it('respects a custom widget list instead of always using the full registry', () => {
    const subset = WIDGET_LIST.slice(0, 1)
    const groups = groupWidgetsByCategory(subset)
    expect(groups.flatMap((group) => group.widgets)).toEqual(subset)
  })
})
