import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('WidgetErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <WidgetErrorBoundary widgetName="Test Widget">
        <p>All good</p>
      </WidgetErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it("catches a crashing widget and shows a fallback instead of the app's own error screen", () => {
    // React logs the error to console even when a boundary catches it —
    // silence that expected noise for this test only.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <WidgetErrorBoundary widgetName="Test Widget">
        <Bomb />
      </WidgetErrorBoundary>,
    )

    expect(screen.getByText(/Test Widget crashed/i)).toBeInTheDocument()
  })

  it('isolates a crash to just the failing widget, not its siblings', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <div>
        <WidgetErrorBoundary widgetName="Broken Widget">
          <Bomb />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary widgetName="Healthy Widget">
          <p>Still here</p>
        </WidgetErrorBoundary>
      </div>,
    )

    expect(screen.getByText(/Broken Widget crashed/i)).toBeInTheDocument()
    expect(screen.getByText('Still here')).toBeInTheDocument()
  })
})
