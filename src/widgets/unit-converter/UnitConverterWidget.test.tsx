import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnitConverterWidget from './UnitConverterWidget'

describe('UnitConverterWidget', () => {
  it('starts converting 1 meter to feet', () => {
    render(<UnitConverterWidget instanceId="test" mode="grid" />)
    expect(screen.getByText('3.28084')).toBeInTheDocument()
  })

  it('recomputes as the value changes', async () => {
    const user = userEvent.setup()
    render(<UnitConverterWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '10')

    expect(screen.getByText('32.808399')).toBeInTheDocument()
  })

  it('swaps the from/to units', async () => {
    const user = userEvent.setup()
    render(<UnitConverterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /swap units/i }))

    expect(screen.getByLabelText(/^from$/i)).toHaveValue('ft')
    expect(screen.getByLabelText(/^to$/i)).toHaveValue('m')
  })

  it('switches category and converts temperature with its own formula', async () => {
    const user = userEvent.setup()
    render(<UnitConverterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Temp' }))
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'f')
    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '100')

    expect(screen.getByText('212')).toBeInTheDocument()
  })

  it('switches to the Time category and converts days to hours', async () => {
    const user = userEvent.setup()
    render(<UnitConverterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Time' }))
    await user.selectOptions(screen.getByLabelText(/^from$/i), 'd')
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'h')
    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '2')

    expect(screen.getByText('48')).toBeInTheDocument()
  })

  it('shows a tiny nonzero result in scientific notation instead of a misleading "0"', async () => {
    const user = userEvent.setup()
    render(<UnitConverterWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Data' }))
    await user.selectOptions(screen.getByLabelText(/^from$/i), 'B')
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'GiB')
    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '1')

    // 1 byte in GiB — would round to "0" at fixed precision
    expect(screen.getByText('9.313226e-10')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
