import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { WidgetOverlay } from '@/overlay/WidgetOverlay'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import type { DashboardWidgetInstance } from '@/types/layout'
import { PortalableWidget } from './PortalableWidget'

const INSTANCE: DashboardWidgetInstance = {
  instanceId: 'test-base64',
  widgetId: 'base64',
  x: 0,
  y: 0,
  w: 2,
  h: 2,
}

describe('PortalableWidget expand/collapse', () => {
  beforeEach(() => {
    useOverlayStore.setState({ target: null })
  })

  it('keeps the same widget instance mounted — typed text survives expand and collapse', async () => {
    const user = userEvent.setup()

    render(
      <WidgetOverlay>
        <PortalableWidget instance={INSTANCE} onRemove={() => {}} editable />
      </WidgetOverlay>,
    )

    // Collapsed: type into the widget while it's rendered in the grid cell.
    const collapsedInput = await screen.findByPlaceholderText(/text to encode/i)
    await user.type(collapsedInput, 'hello world')
    expect(collapsedInput).toHaveValue('hello world')

    // Expand — this swaps the portal's target, it must not remount the
    // widget's own React component instance.
    act(() => {
      useOverlayStore.getState().expandPinned(INSTANCE.instanceId)
    })
    const expandedInput = await screen.findByPlaceholderText(/text to encode/i)
    expect(expandedInput).toHaveValue('hello world')
    // Genuinely the same DOM node moved via portal, not a lookalike re-render.
    expect(expandedInput).toBe(collapsedInput)

    // Collapse back — same guarantee in reverse.
    act(() => {
      useOverlayStore.getState().close()
    })
    const collapsedAgainInput =
      await screen.findByPlaceholderText(/text to encode/i)
    expect(collapsedAgainInput).toHaveValue('hello world')
    expect(collapsedAgainInput).toBe(collapsedInput)
  })
})
