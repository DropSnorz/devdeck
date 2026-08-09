import { beforeEach, describe, expect, it } from 'vitest'
import { useDashboardStore } from './useDashboardStore'

describe('useDashboardStore', () => {
  beforeEach(() => {
    // The store seeds a starter layout on first import; reset to empty
    // before each test so tests don't leak state into one another.
    useDashboardStore.setState({ widgets: [] })
  })

  it('addWidget appends a new instance sized from the widget definition', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    const { widgets } = useDashboardStore.getState()
    expect(widgets).toHaveLength(1)
    expect(widgets[0]).toMatchObject({
      widgetId: 'uuid-generator',
      x: 0,
      y: 0,
      w: 2,
      h: 3,
    })
  })

  it('addWidget ignores an unknown widget id', () => {
    useDashboardStore.getState().addWidget('does-not-exist')
    expect(useDashboardStore.getState().widgets).toHaveLength(0)
  })

  it('addWidget stacks each new widget below the ones already there', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    useDashboardStore.getState().addWidget('base64')
    const { widgets } = useDashboardStore.getState()
    expect(widgets[1].y).toBe(widgets[0].y + widgets[0].h)
  })

  it('removeWidget removes only the targeted instance', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    useDashboardStore.getState().addWidget('base64')
    const [first] = useDashboardStore.getState().widgets
    useDashboardStore.getState().removeWidget(first.instanceId)
    const { widgets } = useDashboardStore.getState()
    expect(widgets).toHaveLength(1)
    expect(widgets[0].widgetId).toBe('base64')
  })

  it('applyLayoutUpdate updates position/size for matching instances only', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    useDashboardStore.getState().addWidget('base64')
    const [first, second] = useDashboardStore.getState().widgets
    useDashboardStore
      .getState()
      .applyLayoutUpdate([{ i: first.instanceId, x: 5, y: 3, w: 4, h: 4 }])
    const { widgets } = useDashboardStore.getState()
    expect(widgets[0]).toMatchObject({ x: 5, y: 3, w: 4, h: 4 })
    expect(widgets[1]).toMatchObject({
      x: second.x,
      y: second.y,
      w: second.w,
      h: second.h,
    })
  })

  it('setWidgetPosition patches a single instance (the keyboard move/resize path)', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    const [instance] = useDashboardStore.getState().widgets
    useDashboardStore.getState().setWidgetPosition(instance.instanceId, {
      x: 1,
      y: 1,
      w: 3,
      h: 3,
    })
    expect(useDashboardStore.getState().widgets[0]).toMatchObject({
      x: 1,
      y: 1,
      w: 3,
      h: 3,
    })
  })

  it('addWidgetAt places the instance at the given position instead of stacking it', () => {
    useDashboardStore
      .getState()
      .addWidgetAt('json-formatter', { x: 3, y: 2, w: 4, h: 4 })
    const { widgets } = useDashboardStore.getState()
    expect(widgets).toHaveLength(1)
    expect(widgets[0]).toMatchObject({
      widgetId: 'json-formatter',
      x: 3,
      y: 2,
      w: 4,
      h: 4,
    })
  })

  it('addWidgetAt ignores an unknown widget id (the sidebar-drop rejection path)', () => {
    useDashboardStore
      .getState()
      .addWidgetAt('does-not-exist', { x: 0, y: 0, w: 2, h: 2 })
    expect(useDashboardStore.getState().widgets).toHaveLength(0)
  })

  it('hasWidget reflects whether a widget type is currently on the dashboard', () => {
    expect(useDashboardStore.getState().hasWidget('uuid-generator')).toBe(false)
    useDashboardStore.getState().addWidget('uuid-generator')
    expect(useDashboardStore.getState().hasWidget('uuid-generator')).toBe(true)
  })

  it('replaceWidgets swaps the entire layout at once (the share-link accept path)', () => {
    useDashboardStore.getState().addWidget('uuid-generator')
    const incoming = [
      { instanceId: 'shared-1', widgetId: 'base64', x: 0, y: 0, w: 2, h: 2 },
    ]
    useDashboardStore.getState().replaceWidgets(incoming)
    expect(useDashboardStore.getState().widgets).toEqual(incoming)
  })
})
