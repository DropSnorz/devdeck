import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { useOverlayStore } from '@/overlay/useOverlayStore'
import type { Dashboard as DashboardType } from '@/types/layout'
import { Dashboard } from './Dashboard'
import { useDashboardStore } from './useDashboardStore'

const WIDGET_INSTANCE = { instanceId: 'a-base64', widgetId: 'base64', x: 0, y: 0, w: 2, h: 2 }

const DASHBOARDS_DISJOINT: DashboardType[] = [
  { id: 'dash-a', name: 'Dashboard A', widgets: [WIDGET_INSTANCE] },
  { id: 'dash-b', name: 'Dashboard B', widgets: [] },
]

beforeEach(() => {
  window.location.hash = ''
  useOverlayStore.setState({ target: null })
})

describe('Dashboard — overlay scoped to the active dashboard', () => {
  it('closes an expanded pinned widget when switching to a tab that does not have it', async () => {
    const user = userEvent.setup()
    useDashboardStore.setState({ dashboards: DASHBOARDS_DISJOINT, activeDashboardId: 'dash-a' })
    render(<Dashboard />)

    act(() => {
      useOverlayStore.getState().expandPinned(WIDGET_INSTANCE.instanceId, WIDGET_INSTANCE.widgetId)
    })
    expect(useOverlayStore.getState().target).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Dashboard B' }))

    expect(useOverlayStore.getState().target).toBeNull()
  })

  it('leaves the overlay open when switching to a tab that still has the target instance', async () => {
    const user = userEvent.setup()
    useDashboardStore.setState({
      dashboards: [
        DASHBOARDS_DISJOINT[0],
        { id: 'dash-b', name: 'Dashboard B', widgets: [WIDGET_INSTANCE] },
      ],
      activeDashboardId: 'dash-a',
    })
    render(<Dashboard />)

    act(() => {
      useOverlayStore.getState().expandPinned(WIDGET_INSTANCE.instanceId, WIDGET_INSTANCE.widgetId)
    })

    await user.click(screen.getByRole('button', { name: 'Dashboard B' }))

    expect(useOverlayStore.getState().target).not.toBeNull()
  })
})
