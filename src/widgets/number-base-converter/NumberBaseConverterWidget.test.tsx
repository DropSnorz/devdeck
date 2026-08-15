import { describe, expect, it } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NumberBaseConverterWidget from './NumberBaseConverterWidget'

/** Different bases can render the same digits for a given value (e.g. 10
 * is "a" in both duodecimal and hex), so scope each assertion to its own
 * row instead of asserting the digits are unique on the page. */
function baseValue(labelPattern: RegExp): string | null {
  const labelEl = screen.getByText(labelPattern)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`no row found for label matching ${labelPattern}`)
  return within(row).getByText(/^[0-9a-z-]+$|^—$/).textContent
}

describe('NumberBaseConverterWidget', () => {
  it('starts at 255 decimal, converted into every common base', () => {
    render(<NumberBaseConverterWidget instanceId="test" mode="grid" />)

    expect(baseValue(/^Binary/)).toBe('11111111')
    expect(baseValue(/^Octal/)).toBe('377')
    expect(baseValue(/^Duodecimal/)).toBe('193')
    expect(baseValue(/^Hexadecimal/)).toBe('ff')
  })

  it('updates every base when the value changes', async () => {
    const user = userEvent.setup()
    render(<NumberBaseConverterWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '20')

    expect(baseValue(/^Binary/)).toBe('10100')
    expect(baseValue(/^Hexadecimal/)).toBe('14')
  })

  it('shows an error for a digit outside the selected base', async () => {
    const user = userEvent.setup()
    render(<NumberBaseConverterWidget instanceId="test" mode="grid" />)

    // fireEvent.change rather than clear+type — NumberField rounds/clamps on
    // every keystroke, so typing digit-by-digit into an already-controlled
    // value produces intermediate states instead of landing on "2".
    fireEvent.change(screen.getByLabelText(/from base/i), { target: { value: '2' } })
    await user.clear(screen.getByLabelText(/value/i))
    await user.type(screen.getByLabelText(/value/i), '2')

    expect(screen.getByText(/invalid digit for base 2/i)).toBeInTheDocument()
  })

  it('reflects a custom base as it changes', () => {
    render(<NumberBaseConverterWidget instanceId="test" mode="grid" />)

    fireEvent.change(screen.getByLabelText(/custom base/i), { target: { value: '3' } })

    expect(baseValue(/^Base 3$/)).toBe('100110') // 255 in base 3
  })
})
