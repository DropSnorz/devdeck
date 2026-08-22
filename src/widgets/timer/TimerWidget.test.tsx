import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import TimerWidget from './TimerWidget'

describe('TimerWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the live local clock by default, ticking once a second', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)

    expect(screen.getByText('09:00:00')).toBeInTheDocument()
    expect(screen.getByText('Monday, January 1, 2024')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('09:00:01')).toBeInTheDocument()
  })

  it('runs the stopwatch, accumulating elapsed time across pauses', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))

    expect(screen.getByText('00:00.00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.getByText('00:01.50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Paused, so no further time accumulates while 5s pass.
    expect(screen.getByText('00:01.50')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:02.50')).toBeInTheDocument()
  })

  it('does not drop a partial tick of elapsed time when pausing or lapping', () => {
    // Regression test: the stopwatch only re-renders every 100ms, so a
    // click landing between ticks used to read the *previous* tick's
    // stale `now` — losing up to a tick's worth of centiseconds off the
    // recorded total instead of capturing the exact time of the click.
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    // Lands 50ms after the last 100ms tick (which fired at 1000ms).
    act(() => {
      vi.advanceTimersByTime(1050)
    })
    fireEvent.click(screen.getByRole('button', { name: /lap/i }))
    expect(screen.getByText('Lap 1')).toBeInTheDocument()
    // Main display, lap split, and lap cumulative total (equal, for a
    // first lap) all read the exact click time.
    expect(screen.getAllByText('00:01.05')).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(screen.getAllByText('00:01.05')).toHaveLength(3)
  })

  it('records laps with a running total and a per-lap split', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByRole('button', { name: /lap/i }))

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    fireEvent.click(screen.getByRole('button', { name: /lap/i }))

    expect(screen.getByText('Lap 1')).toBeInTheDocument()
    expect(screen.getByText('Lap 2')).toBeInTheDocument()
    // Lap 2 (most recent) shows a 2s split; its 3s cumulative total matches
    // the running stopwatch display above the lap list (two occurrences).
    expect(screen.getByText('00:02.00')).toBeInTheDocument()
    expect(screen.getAllByText('00:03.00')).toHaveLength(2)
  })

  it('resets the stopwatch back to zero, clearing laps', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByRole('button', { name: /lap/i }))
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByText('00:00.00')).toBeInTheDocument()
    expect(screen.queryByText('Lap 1')).not.toBeInTheDocument()
  })

  it('counts down from the configured duration and alerts on completion', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    expect(screen.getByText('00:03.00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:02.00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('00:00.00')).toBeInTheDocument()
    expect(screen.getByText(/time's up/i)).toBeInTheDocument()
  })

  it('draws the progress ring sweeping from full to empty as the countdown runs', () => {
    const { container } = render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    const progressRing = container.querySelectorAll('circle')[1]
    expect(progressRing).toHaveAttribute('stroke-dashoffset', '0')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Half the duration has elapsed, so the ring is half depleted.
    const circumference = 2 * Math.PI * 54
    expect(Number(progressRing.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference / 2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(Number(progressRing.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference)
  })

  it('pauses and resumes the countdown without losing remaining time', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(screen.getByText('00:06.00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Still paused, so remaining time hasn't moved.
    expect(screen.getByText('00:06.00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('00:05.00')).toBeInTheDocument()
  })

  it('does not jump the remaining time backward the instant Resume is clicked', () => {
    // Regression test: nothing ticks while paused, so the internal "now"
    // clock used to sit stale until the first post-resume tick — long
    // enough for the paused clock's own gap, `endAt - staleNow`, to briefly
    // read as *more* time remaining than was showing when Pause was
    // clicked, i.e. the countdown visibly ran backward for one frame.
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    fireEvent.click(screen.getByRole('button', { name: /pause/i }))
    expect(screen.getByText('00:06.00')).toBeInTheDocument()

    // A long real-world pause — well past the last tick before Pause.
    act(() => {
      vi.advanceTimersByTime(8000)
    })

    fireEvent.click(screen.getByRole('button', { name: /resume/i }))
    // Must read exactly where it left off on the very next render — not
    // above 00:06.00 (the bug) and not below it either.
    expect(screen.getByText('00:06.00')).toBeInTheDocument()
  })

  it('disables Start while the configured duration is zero', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '0' } })

    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
    expect(screen.getByText(/set a duration greater than zero/i)).toBeInTheDocument()
  })

  it('applies a preset duration', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))

    fireEvent.click(screen.getByRole('button', { name: '5 min' }))

    expect(screen.getByLabelText(/minutes/i)).toHaveValue(5)
    expect(screen.getByLabelText(/seconds/i)).toHaveValue(0)
  })

  it('resets a finished countdown back to the setup screen', () => {
    render(<TimerWidget instanceId="test" mode="grid" />)
    fireEvent.click(screen.getByRole('button', { name: 'Countdown' }))
    fireEvent.change(screen.getByLabelText(/minutes/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText(/seconds/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/time's up/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText(/seconds/i)).toBeInTheDocument()
    expect(screen.queryByText(/time's up/i)).not.toBeInTheDocument()
  })
})
