import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvisibleCharCleanerWidget from './InvisibleCharCleanerWidget'

// Invisible/supplementary-plane characters aren't reachable through
// userEvent's keyboard-syntax `type()` — paste sidesteps that entirely.
async function pasteInto(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) {
  await user.click(element)
  await user.paste(text)
}

function tagEncode(ascii: string): string {
  return Array.from(ascii)
    .map((char) => String.fromCodePoint(char.codePointAt(0)! + 0xe0000))
    .join('')
}

describe('InvisibleCharCleanerWidget', () => {
  it('shows guidance text when empty', () => {
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)
    expect(screen.getByText(/paste text above to find/i)).toBeInTheDocument()
  })

  it('reports no invisible characters found for plain text', async () => {
    const user = userEvent.setup()
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText(/paste text to scan/i), 'hello world')

    expect(screen.getByText('No invisible characters found.')).toBeInTheDocument()
  })

  it('detects a zero-width space, highlights it, and shows the cleaned text', async () => {
    const user = userEvent.setup()
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText(/paste text to scan/i), 'a​b')

    expect(screen.getByText(/1 invisible character found across 1 type/i)).toBeInTheDocument()
    expect(screen.getByText('ZWSP', { selector: 'mark' })).toBeInTheDocument()
    expect(screen.getByText(/zero width space/i)).toBeInTheDocument()
    expect(screen.getByText('ab')).toBeInTheDocument() // cleaned output
  })

  it('replaces the input with cleaned text when "Use as input" is clicked', async () => {
    const user = userEvent.setup()
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)

    const input = screen.getByPlaceholderText(/paste text to scan/i)
    await pasteInto(user, input, 'a​b')
    await user.click(screen.getByRole('button', { name: /use as input/i }))

    expect(input).toHaveValue('ab')
    expect(screen.getByText('No invisible characters found.')).toBeInTheDocument()
  })

  it('decodes hidden text smuggled inside Unicode tag characters and flags it', async () => {
    const user = userEvent.setup()
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)

    await pasteInto(
      user,
      screen.getByPlaceholderText(/paste text to scan/i),
      `Looks normal${tagEncode('do something else')} to a human`,
    )

    expect(screen.getByText(/hidden text found inside invisible unicode tag characters/i)).toBeInTheDocument()
    expect(screen.getByText('"do something else"')).toBeInTheDocument()
  })

  it('normalizes a non-breaking space to a regular space instead of deleting it', async () => {
    const user = userEvent.setup()
    render(<InvisibleCharCleanerWidget instanceId="test" mode="grid" />)

    await pasteInto(user, screen.getByPlaceholderText(/paste text to scan/i), 'a b')

    expect(screen.getByText(/no-break space/i)).toBeInTheDocument()
    expect(screen.getByText('a b', { selector: 'pre' })).toBeInTheDocument()
  })
})
