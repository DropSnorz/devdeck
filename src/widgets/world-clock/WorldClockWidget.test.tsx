import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorldClockWidget from './WorldClockWidget'

// Default rows depend on the host's own time zone (see defaultCityIds), so
// assertions here avoid relying on which cities start selected — tests add
// and remove a city that would only ever be a default in the extremely
// unlikely case this suite runs with the system clock set to
// Australia/Sydney.

describe('WorldClockWidget', () => {
  it('renders the add-city picker and a reference time field', () => {
    render(<WorldClockWidget instanceId="test" mode="grid" />)
    expect(screen.getByLabelText(/add city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reference time/i)).toBeInTheDocument()
    expect(screen.getByText(/live/i)).toBeInTheDocument()
  })

  it('adds a picked city to the list', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    await user.selectOptions(screen.getByLabelText(/add city/i), 'sydney')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(screen.getByText('Sydney')).toBeInTheDocument()
    // Removed from the picker once it's already on the board.
    expect(screen.queryByRole('option', { name: /sydney/i })).not.toBeInTheDocument()
  })

  it('removes a city from the list', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    await user.selectOptions(screen.getByLabelText(/add city/i), 'sydney')
    await user.click(screen.getByRole('button', { name: /^add$/i }))
    expect(screen.getByText('Sydney')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove sydney/i }))

    expect(screen.queryByText('Sydney')).not.toBeInTheDocument()
    // Back in the picker, available to add again.
    expect(screen.getByRole('option', { name: /sydney/i })).toBeInTheDocument()
  })

  it('does not add the same city twice', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    await user.selectOptions(screen.getByLabelText(/add city/i), 'sydney')
    await user.click(screen.getByRole('button', { name: /^add$/i }))
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(screen.getAllByText('Sydney')).toHaveLength(1)
  })

  it('switches to previewing a custom time when the reference time is edited', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    const dateField = screen.getByLabelText(/reference time/i)
    await user.clear(dateField)
    await user.type(dateField, '2024-01-15T10:30')

    expect(screen.getByText(/previewing a custom time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^now$/i })).toBeEnabled()
  })

  it('jumps back to live time when Now is clicked', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    const dateField = screen.getByLabelText(/reference time/i)
    await user.clear(dateField)
    await user.type(dateField, '2024-01-15T10:30')
    expect(screen.getByText(/previewing a custom time/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^now$/i }))

    expect(screen.getByText(/^live$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^now$/i })).toBeDisabled()
  })

  it('shifts the reference time forward by 1 hour', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    const dateField = screen.getByLabelText(/reference time/i)
    await user.clear(dateField)
    await user.type(dateField, '2024-01-15T10:30')

    await user.click(screen.getByRole('button', { name: /forward 1 hour/i }))

    expect(dateField).toHaveValue('2024-01-15T11:30')
  })

  it('shifts the reference time back by 1 hour', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    const dateField = screen.getByLabelText(/reference time/i)
    await user.clear(dateField)
    await user.type(dateField, '2024-01-15T10:30')

    await user.click(screen.getByRole('button', { name: /back 1 hour/i }))

    expect(dateField).toHaveValue('2024-01-15T09:30')
  })

  it('stacks repeated hour shifts', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    const dateField = screen.getByLabelText(/reference time/i)
    await user.clear(dateField)
    await user.type(dateField, '2024-01-15T23:30')

    await user.click(screen.getByRole('button', { name: /forward 1 hour/i }))
    await user.click(screen.getByRole('button', { name: /forward 1 hour/i }))

    // Crosses midnight into the next day, not just wrapping the hour.
    expect(dateField).toHaveValue('2024-01-16T01:30')
  })

  it('switches out of live mode when shifting the hour from "now"', async () => {
    const user = userEvent.setup()
    render(<WorldClockWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /forward 1 hour/i }))

    expect(screen.getByText(/previewing a custom time/i)).toBeInTheDocument()
  })
})
