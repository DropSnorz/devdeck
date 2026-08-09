import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimestampConverterWidget from './TimestampConverterWidget'

// Mirrors the widget's own local-time formatting exactly, so assertions are
// correct regardless of which timezone the test runner is in — both sides
// read the same Date object's local getters.
function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function toLocalDatetimeInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

describe('TimestampConverterWidget', () => {
  it('converts a typed epoch (seconds) into the matching UTC/ISO instant', async () => {
    const user = userEvent.setup()
    render(<TimestampConverterWidget instanceId="test" mode="grid" />)

    const epochInput = screen.getByLabelText(/epoch/i)
    await user.clear(epochInput)
    await user.type(epochInput, '0')

    // UTC/ISO summary lines come straight from toUTCString()/toISOString(),
    // deterministic regardless of the test runner's own timezone — unlike
    // the datetime-local field's own echoed value, which jsdom normalizes
    // (drops trailing :00 seconds) in a way not worth depending on here.
    expect(screen.getByText('UTC: Thu, 01 Jan 1970 00:00:00 GMT')).toBeInTheDocument()
    expect(screen.getByText('ISO: 1970-01-01T00:00:00.000Z')).toBeInTheDocument()
  })

  it('converts a typed date/time into the matching epoch', async () => {
    const user = userEvent.setup()
    render(<TimestampConverterWidget instanceId="test" mode="grid" />)

    const dateInput = screen.getByLabelText(/local date\/time/i)
    const target = new Date(2024, 0, 15, 10, 30, 0)
    await user.clear(dateInput)
    await user.type(dateInput, toLocalDatetimeInputValue(target))

    expect(screen.getByLabelText(/epoch/i)).toHaveValue(
      String(Math.floor(target.getTime() / 1000)),
    )
  })

  it('recomputes the epoch value when switching units, keeping the same instant', async () => {
    const user = userEvent.setup()
    render(<TimestampConverterWidget instanceId="test" mode="grid" />)

    const epochInput = screen.getByLabelText(/epoch/i)
    await user.clear(epochInput)
    await user.type(epochInput, '5')

    await user.click(screen.getByRole('button', { name: 'Milliseconds' }))

    expect(epochInput).toHaveValue('5000')
  })

  it('shows "Invalid timestamp" for a non-numeric epoch', async () => {
    const user = userEvent.setup()
    render(<TimestampConverterWidget instanceId="test" mode="grid" />)

    const epochInput = screen.getByLabelText(/epoch/i)
    await user.clear(epochInput)
    await user.type(epochInput, 'not-a-number')

    expect(screen.getByText(/invalid timestamp/i)).toBeInTheDocument()
  })

  it('sets the epoch to the current instant when "Now" is clicked', async () => {
    const user = userEvent.setup()
    render(<TimestampConverterWidget instanceId="test" mode="grid" />)

    const beforeSeconds = Math.floor(Date.now() / 1000)
    await user.click(screen.getByRole('button', { name: 'Now' }))
    const afterSeconds = Math.floor(Date.now() / 1000)

    const epochValue = Number((screen.getByLabelText(/epoch/i) as HTMLInputElement).value)
    expect(epochValue).toBeGreaterThanOrEqual(beforeSeconds)
    expect(epochValue).toBeLessThanOrEqual(afterSeconds)
  })
})
