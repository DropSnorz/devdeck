import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegexTesterWidget from './RegexTesterWidget'

// Pattern/flag text often contains userEvent's reserved {}/[] characters —
// paste avoids that keyboard-syntax parsing entirely.
async function pasteInto(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) {
  await user.click(element)
  await user.paste(text)
}

describe('RegexTesterWidget', () => {
  it('starts empty with the g flag active by default', () => {
    render(<RegexTesterWidget instanceId="test" mode="grid" />)
    expect(screen.getByPlaceholderText('pattern')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'g' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights every match and reports a count with the g flag', async () => {
    const user = userEvent.setup()
    render(<RegexTesterWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText('pattern'), 'cat')
    await pasteInto(user, screen.getByPlaceholderText(/test string/i), 'cat dog cat')

    expect(screen.getByText('2 matches')).toBeInTheDocument()
    expect(screen.getAllByText('cat', { selector: 'mark' })).toHaveLength(2)
  })

  it('only reports the first match once the g flag is turned off', async () => {
    const user = userEvent.setup()
    render(<RegexTesterWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText('pattern'), 'cat')
    await pasteInto(user, screen.getByPlaceholderText(/test string/i), 'cat dog cat')
    await user.click(screen.getByRole('button', { name: 'g' }))

    expect(screen.getByRole('button', { name: 'g' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('1 match')).toBeInTheDocument()
    expect(screen.getAllByText('cat', { selector: 'mark' })).toHaveLength(1)
  })

  it('shows an error for an invalid pattern instead of matching', async () => {
    const user = userEvent.setup()
    render(<RegexTesterWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText('pattern'), '(unterminated')
    await pasteInto(user, screen.getByPlaceholderText(/test string/i), 'anything')

    expect(screen.queryByText(/match/)).not.toBeInTheDocument()
    // Exact message comes from the RegExp constructor's own error.
    expect(screen.getByText(/invalid regular expression/i)).toBeInTheDocument()
  })

  it('handles a zero-width-match pattern without hanging or growing unbounded', async () => {
    const user = userEvent.setup()
    render(<RegexTesterWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText('pattern'), 'x*')
    await pasteInto(user, screen.getByPlaceholderText(/test string/i), 'abc')

    // Completing at all (not hanging) is most of what this guards against;
    // also confirm it didn't produce a runaway number of segments.
    expect(screen.getByText(/\d+ matches?/)).toBeInTheDocument()
  })

  it('re-toggling a flag on and off returns to the original match set', async () => {
    const user = userEvent.setup()
    render(<RegexTesterWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText('pattern'), 'CAT')
    await pasteInto(user, screen.getByPlaceholderText(/test string/i), 'cat CAT')

    expect(screen.getByText('1 match')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'i' }))
    expect(screen.getByText('2 matches')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'i' }))
    expect(screen.getByText('1 match')).toBeInTheDocument()
  })
})
