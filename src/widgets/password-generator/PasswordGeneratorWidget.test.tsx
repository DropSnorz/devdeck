import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordGeneratorWidget from './PasswordGeneratorWidget'

function getOutput() {
  return screen.getByPlaceholderText<HTMLInputElement>(/generated password/i)
}

// fireEvent.change rather than clear+type for the length field — NumberField
// clamps on every keystroke, so typing digit-by-digit into an
// already-controlled value below the minimum produces intermediate clamped
// states instead of landing on the intended number (see
// NumberBaseConverterWidget.test.tsx for the same pattern).
function setLength(value: string) {
  fireEvent.change(screen.getByLabelText(/length/i), { target: { value } })
}

describe('PasswordGeneratorWidget', () => {
  it('starts empty, with no password generated', () => {
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)
    expect(getOutput()).toHaveValue('')
  })

  it('generates a 16-character password by default once Regenerate is clicked', async () => {
    const user = userEvent.setup()
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    expect(getOutput().value).toHaveLength(16)
  })

  it('generates a password matching the requested length', async () => {
    const user = userEvent.setup()
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    setLength('32')
    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    expect(getOutput().value).toHaveLength(32)
  })

  it('disables Regenerate and shows an error once every character set is turned off', async () => {
    const user = userEvent.setup()
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    // Defaults are A-Z, a-z, 0-9 on and !@# off — turn off the three that are on.
    await user.click(screen.getByRole('button', { name: 'A-Z' }))
    await user.click(screen.getByRole('button', { name: 'a-z' }))
    await user.click(screen.getByRole('button', { name: '0-9' }))

    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled()
    expect(screen.getByText(/select at least one character set/i)).toBeInTheDocument()
  })

  it('only uses digits once every other character set is turned off', async () => {
    const user = userEvent.setup()
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'A-Z' }))
    await user.click(screen.getByRole('button', { name: 'a-z' }))
    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    expect(getOutput().value).toMatch(/^\d{16}$/)
  })

  it('excludes ambiguous characters once that option is enabled', async () => {
    const user = userEvent.setup()
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: '!@#' }))
    await user.click(screen.getByRole('button', { name: /exclude similar characters/i }))
    setLength('128')
    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    expect(getOutput().value).not.toMatch(/[Il1O0o|]/)
  })

  it('shows a strength label that reacts to the current settings', () => {
    render(<PasswordGeneratorWidget instanceId="test" mode="grid" />)

    setLength('4')

    expect(screen.getByText(/very weak/i)).toBeInTheDocument()
  })
})
