import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubnetCalculatorWidget from './SubnetCalculatorWidget'

/** Reads a result row's value by its label — scoped to the row's own
 * `.font-mono` span rather than a text-content regex, since several
 * labels/values ("Address type" / "Private (RFC 1918)") share plain words
 * that would otherwise ambiguously match each other. */
function rowValue(labelPattern: RegExp): string | null {
  const labelEl = screen.getByText(labelPattern)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`no row found for label matching ${labelPattern}`)
  const valueEl = row.querySelector('.font-mono')
  if (!valueEl) throw new Error(`no value span found for label matching ${labelPattern}`)
  return valueEl.textContent
}

describe('SubnetCalculatorWidget', () => {
  it('starts at 192.168.1.0/24, showing the full breakdown', () => {
    render(<SubnetCalculatorWidget instanceId="test" mode="grid" />)

    expect(rowValue(/^CIDR notation/)).toBe('192.168.1.0/24')
    expect(rowValue(/^Network address/)).toBe('192.168.1.0')
    expect(rowValue(/^Broadcast address/)).toBe('192.168.1.255')
    expect(rowValue(/^Subnet mask/)).toBe('255.255.255.0')
    expect(rowValue(/^Wildcard mask/)).toBe('0.0.0.255')
    expect(rowValue(/^First host/)).toBe('192.168.1.1')
    expect(rowValue(/^Last host/)).toBe('192.168.1.254')
    expect(rowValue(/^Usable hosts/)).toBe('254')
    expect(rowValue(/^Total addresses/)).toBe('256')
    expect(rowValue(/^IP class/)).toBe('C')
    expect(rowValue(/^Address type/)).toBe('Private (RFC 1918)')
  })

  it('recomputes when the prefix changes', () => {
    render(<SubnetCalculatorWidget instanceId="test" mode="grid" />)

    fireEvent.change(screen.getByLabelText(/prefix/i), { target: { value: '16' } })

    expect(rowValue(/^Network address/)).toBe('192.168.0.0')
    expect(rowValue(/^Broadcast address/)).toBe('192.168.255.255')
    expect(rowValue(/^Usable hosts/)).toBe('65534')
  })

  it('accepts a full CIDR block pasted into the address field', async () => {
    const user = userEvent.setup()
    render(<SubnetCalculatorWidget instanceId="test" mode="grid" />)

    const addressField = screen.getByLabelText(/ip address/i)
    await user.clear(addressField)
    await user.type(addressField, '10.0.0.0/8')

    expect(addressField).toHaveValue('10.0.0.0')
    expect(screen.getByLabelText(/prefix/i)).toHaveValue(8)
    expect(rowValue(/^Broadcast address/)).toBe('10.255.255.255')
  })

  it('shows an error for an invalid address', async () => {
    const user = userEvent.setup()
    render(<SubnetCalculatorWidget instanceId="test" mode="grid" />)

    const addressField = screen.getByLabelText(/ip address/i)
    await user.clear(addressField)
    await user.type(addressField, '999.0.0.1')

    expect(screen.getByText(/enter a valid ipv4 address/i)).toBeInTheDocument()
    expect(rowValue(/^CIDR notation/)).toBe('—')
  })

  it('treats a /31 as a two-address point-to-point link', () => {
    render(<SubnetCalculatorWidget instanceId="test" mode="grid" />)

    fireEvent.change(screen.getByLabelText(/prefix/i), { target: { value: '31' } })

    expect(rowValue(/^First host/)).toBe('192.168.1.0')
    expect(rowValue(/^Last host/)).toBe('192.168.1.1')
    expect(rowValue(/^Usable hosts/)).toBe('2')
  })
})
