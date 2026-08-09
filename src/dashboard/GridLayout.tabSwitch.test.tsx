import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { WidgetOverlay } from '@/overlay/WidgetOverlay'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import type { Dashboard } from '@/types/layout'
import { GridLayout } from './GridLayout'
import { useDashboardStore } from './useDashboardStore'

const TAB_A = 'tab-a'
const TAB_B = 'tab-b'

const DASHBOARDS: Dashboard[] = [
  { id: TAB_A, name: 'A', widgets: [{ instanceId: 'a-base64', widgetId: 'base64', x: 0, y: 0, w: 2, h: 2 }] },
  { id: TAB_B, name: 'B', widgets: [] },
]

// Mirrors how Dashboard.tsx mounts only the active dashboard's GridLayout,
// keyed by dashboardId — this is the actual mechanism under test, not a
// simplified stand-in for it.
function TwoTabHarness() {
  const [activeId, setActiveId] = useState(TAB_A)
  return (
    <WidgetOverlay>
      <GridLayout key={activeId} dashboardId={activeId} />
      <button type="button" onClick={() => setActiveId(TAB_B)}>
        Switch to B
      </button>
      <button type="button" onClick={() => setActiveId(TAB_A)}>
        Switch to A
      </button>
    </WidgetOverlay>
  )
}

beforeEach(() => {
  useDashboardStore.setState({ dashboards: DASHBOARDS, activeDashboardId: TAB_A })
  useOverlayStore.setState({ target: null })
})

describe('tab switching preserves widget state through a real unmount/remount', () => {
  it('keeps typed content even though the widget genuinely unmounts on switch', async () => {
    const user = userEvent.setup()
    render(<TwoTabHarness />)

    const input = await screen.findByPlaceholderText(/text to encode/i)
    await user.type(input, 'hello world')
    expect(input).toHaveValue('hello world')

    await user.click(screen.getByRole('button', { name: 'Switch to B' }))

    // Dashboard A's whole grid is gone — this is a real unmount now, not a
    // CSS visibility toggle, which is the actual point of the redesign.
    expect(screen.queryByPlaceholderText(/text to encode/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Switch to A' }))

    // A fresh mount, but the content survived via useWidgetState's store.
    const remountedInput = await screen.findByPlaceholderText(/text to encode/i)
    expect(remountedInput).toHaveValue('hello world')
    expect(remountedInput).not.toBe(input)
  })
})
