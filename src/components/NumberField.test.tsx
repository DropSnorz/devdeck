import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberField } from './NumberField'

/** NumberField is a controlled `(value, onChange)` pair — wrap it in a tiny
 * stateful harness so keystrokes round-trip through a real parent, the same
 * way every widget uses it. */
function Harness({ initial = 16, min, max }: { initial?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(initial)
  return <NumberField label="Length" value={value} min={min} max={max} onChange={setValue} />
}

describe('NumberField', () => {
  it('lets a value be backspaced down to exactly `min` and typed over', async () => {
    // Regression test: backspacing "5" down to blank used to clamp-and-
    // redisplay "4" (== min) on that very keystroke, so the next keystroke
    // (typing "4") appended instead of replaced, landing on "44".
    const user = userEvent.setup()
    render(<Harness initial={5} min={4} max={128} />)

    const input = screen.getByLabelText('Length')
    await user.click(input)
    await user.keyboard('{End}{Backspace}')
    expect(input).toHaveValue(null) // blank while mid-edit, not snapped to min

    await user.keyboard('4')
    expect(input).toHaveValue(4)
  })

  it('does not force an in-progress edit back to a clamped value', async () => {
    // Typing "20" necessarily passes through "2", which alone is below a
    // min of 4 — that shouldn't get rewritten before the second digit lands.
    const user = userEvent.setup()
    render(<Harness initial={5} min={4} max={128} />)

    const input = screen.getByLabelText('Length')
    await user.click(input)
    await user.keyboard('{End}{Backspace}2')
    expect(input).toHaveValue(2)
    await user.keyboard('0')
    expect(input).toHaveValue(20)
  })

  it('clamps a below-`min` value to `min` on blur', async () => {
    const user = userEvent.setup()
    render(<Harness initial={5} min={4} max={128} />)

    const input = screen.getByLabelText('Length')
    await user.click(input)
    await user.keyboard('{End}{Backspace}2')
    expect(input).toHaveValue(2)

    await user.tab()
    expect(input).toHaveValue(4)
  })

  it('clamps an above-`max` value to `max` on blur', async () => {
    const user = userEvent.setup()
    render(<Harness initial={5} min={4} max={128} />)

    const input = screen.getByLabelText('Length')
    await user.click(input)
    await user.keyboard('{End}{Backspace}999')
    expect(input).toHaveValue(999)

    await user.tab()
    expect(input).toHaveValue(128)
  })

  it('reverts to the last valid value on blur if left blank', async () => {
    const user = userEvent.setup()
    render(<Harness initial={5} min={4} max={128} />)

    const input = screen.getByLabelText('Length')
    await user.click(input)
    await user.keyboard('{End}{Backspace}')
    expect(input).toHaveValue(null)

    await user.tab()
    expect(input).toHaveValue(5)
  })

  it('reflects an external value change immediately while unfocused', () => {
    function ExternallyDriven() {
      const [value, setValue] = useState(10)
      return (
        <>
          <NumberField label="Prefix" value={value} min={0} max={32} onChange={setValue} />
          <button type="button" onClick={() => setValue(24)}>
            set to 24
          </button>
        </>
      )
    }
    render(<ExternallyDriven />)
    fireEvent.click(screen.getByRole('button', { name: 'set to 24' }))
    expect(screen.getByLabelText('Prefix')).toHaveValue(24)
  })
})
