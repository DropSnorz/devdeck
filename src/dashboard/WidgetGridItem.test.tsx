import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { WidgetOverlay } from '@/overlay/WidgetOverlay'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import type { DashboardWidgetInstance } from '@/types/layout'
import { WidgetGridItem } from './WidgetGridItem'

const INSTANCE: DashboardWidgetInstance = {
  instanceId: 'test-base64',
  widgetId: 'base64',
  x: 0,
  y: 0,
  w: 2,
  h: 2,
}

beforeEach(() => {
  useOverlayStore.setState({ target: null })
})

describe('WidgetGridItem expand/collapse', () => {
  it('preserves typed content across expand/collapse via shared state, not the same DOM node', async () => {
    const user = userEvent.setup()

    render(
      <WidgetOverlay>
        <WidgetGridItem dashboardId="test-dashboard" instance={INSTANCE} onRemove={() => {}} editable />
      </WidgetOverlay>,
    )

    // Collapsed: type into the widget while it's rendered in the grid cell.
    const collapsedInput = await screen.findByPlaceholderText(/text to encode/i)
    await user.type(collapsedInput, 'hello world')
    expect(collapsedInput).toHaveValue('hello world')

    // Expand — the grid cell switches to a placeholder, the overlay mounts
    // its own independent copy of the widget reading the same instanceId's
    // content (no portal involved anymore).
    act(() => {
      useOverlayStore.getState().expandPinned(INSTANCE.instanceId, INSTANCE.widgetId)
    })
    const expandedInput = await screen.findByPlaceholderText(/text to encode/i)
    expect(expandedInput).toHaveValue('hello world')
    // Independent mounts now — no longer the same node relocated via portal.
    expect(expandedInput).not.toBe(collapsedInput)
    expect(screen.getByText('Expanded')).toBeInTheDocument()

    // Collapse back — the grid cell's own copy still shows the content too.
    act(() => {
      useOverlayStore.getState().close()
    })
    const collapsedAgainInput = await screen.findByPlaceholderText(/text to encode/i)
    expect(collapsedAgainInput).toHaveValue('hello world')
  })
})

describe('WidgetGridItem — content survives a genuine unmount/remount', () => {
  it('shows previously typed content again after being fully unmounted and remounted', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <WidgetOverlay>
        <WidgetGridItem dashboardId="test-dashboard" instance={INSTANCE} onRemove={() => {}} editable />
      </WidgetOverlay>,
    )

    const input = await screen.findByPlaceholderText(/text to encode/i)
    await user.type(input, 'still here')
    expect(input).toHaveValue('still here')

    // Genuinely tear the whole tree down — this is what a tab switch does
    // now, unlike the old portal/carrier mechanism which never allowed it.
    unmount()

    render(
      <WidgetOverlay>
        <WidgetGridItem dashboardId="test-dashboard" instance={INSTANCE} onRemove={() => {}} editable />
      </WidgetOverlay>,
    )

    const remountedInput = await screen.findByPlaceholderText(/text to encode/i)
    expect(remountedInput).toHaveValue('still here')
    expect(remountedInput).not.toBe(input)
  })
})
