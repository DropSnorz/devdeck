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
})
