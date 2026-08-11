import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import CronWidget from './CronWidget'

describe('CronWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes the default expression and lists its next 3 triggers', () => {
    render(<CronWidget instanceId="test" mode="grid" />)

    expect(screen.getByText('Every 5 minutes, every day')).toBeInTheDocument()
    // 10:00 + 5/10/15 minutes.
    expect(screen.getByText('Mon 2024-01-01 10:05')).toBeInTheDocument()
    expect(screen.getByText('Mon 2024-01-01 10:10')).toBeInTheDocument()
    expect(screen.getByText('Mon 2024-01-01 10:15')).toBeInTheDocument()
    expect(screen.getByText('in 5m')).toBeInTheDocument()
  })

  it('shows a validation error for a malformed expression', () => {
    render(<CronWidget instanceId="test" mode="grid" />)

    const input = screen.getByLabelText(/cron expression/i)
    fireEvent.change(input, { target: { value: '* * * *' } })

    expect(screen.getByText(/expected 5 fields/i)).toBeInTheDocument()
  })

  it('updates the description and triggers when a preset is clicked', () => {
    render(<CronWidget instanceId="test" mode="grid" />)

    fireEvent.click(screen.getByRole('button', { name: 'Hourly' }))

    expect(screen.getByLabelText(/cron expression/i)).toHaveValue('0 * * * *')
    expect(
      screen.getByText('At minute 0 of every hour, every day'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mon 2024-01-01 11:00')).toBeInTheDocument()
  })

  it('re-derives the relative labels as time passes', () => {
    render(<CronWidget instanceId="test" mode="grid" />)

    expect(screen.getByText('in 5m')).toBeInTheDocument()

    // Advance the same fake clock the widget's own 1s ticker reads from,
    // landing 30s before the 10:05 trigger.
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000 + 30 * 1000)
    })

    expect(screen.getByText('in 30s')).toBeInTheDocument()
  })

  describe('trigger progress bars', () => {
    // Matched by the fill element's own transition class rather than
    // `[aria-hidden="true"]`, which also matches decorative icons (e.g. the
    // copy button's) elsewhere in the widget.
    function barWidths(container: HTMLElement): number[] {
      return Array.from(
        container.querySelectorAll('[class*="transition-[width]"]'),
      ).map((bar) => parseFloat((bar as HTMLElement).style.width))
    }

    it('matches the 1/3, 2/3, 3/3 worked example right at the window anchor', () => {
      // Default "*/5 * * * *" at exactly 10:00 — the previous trigger was
      // also exactly 10:00, so "now" sits right at the window's start.
      const { container } = render(<CronWidget instanceId="test" mode="grid" />)

      const widths = barWidths(container)
      expect(widths).toHaveLength(3)
      expect(widths[0]).toBeCloseTo((1 / 3) * 100, 1)
      expect(widths[1]).toBeCloseTo((2 / 3) * 100, 1)
      expect(widths[2]).toBeCloseTo(100, 1)
    })

    it('drains toward the soonest trigger and shifts the others down as time passes', () => {
      const { container } = render(<CronWidget instanceId="test" mode="grid" />)

      // 30s before the 10:05 trigger, out of the 15-minute (10:00-10:15) window.
      act(() => {
        vi.advanceTimersByTime(4 * 60 * 1000 + 30 * 1000)
      })

      const widths = barWidths(container)
      expect(widths[0]).toBeCloseTo((0.5 / 15) * 100, 1)
      expect(widths[1]).toBeCloseTo((5.5 / 15) * 100, 1)
      expect(widths[2]).toBeCloseTo((10.5 / 15) * 100, 1)
    })

    it('resets to a fresh 1/3, 2/3, 3/3 window once a trigger fires and the list rotates', () => {
      const { container } = render(<CronWidget instanceId="test" mode="grid" />)

      // Exactly 5 minutes on: the 10:05 trigger just fired, so the window
      // is now 10:05 (new anchor) through the new third trigger, 10:20.
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000)
      })

      expect(screen.getByText('Mon 2024-01-01 10:10')).toBeInTheDocument()
      expect(screen.getByText('Mon 2024-01-01 10:15')).toBeInTheDocument()
      expect(screen.getByText('Mon 2024-01-01 10:20')).toBeInTheDocument()

      const widths = barWidths(container)
      expect(widths[0]).toBeCloseTo((1 / 3) * 100, 1)
      expect(widths[1]).toBeCloseTo((2 / 3) * 100, 1)
      expect(widths[2]).toBeCloseTo(100, 1)
    })

    it('renders no progress bars when the expression is invalid', () => {
      const { container } = render(<CronWidget instanceId="test" mode="grid" />)

      fireEvent.change(screen.getByLabelText(/cron expression/i), {
        target: { value: '* * * *' },
      })

      expect(barWidths(container)).toHaveLength(0)
    })
  })
})
