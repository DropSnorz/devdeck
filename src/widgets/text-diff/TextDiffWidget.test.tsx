import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextDiffWidget from './TextDiffWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

describe('TextDiffWidget', () => {
  it('renders the sample texts with their diff already computed', () => {
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    expect(screen.getByRole('textbox', { name: 'Original text' })).toHaveTextContent('jumps')
    expect(screen.getByRole('textbox', { name: 'Changed text' })).toHaveTextContent('leaps')
    expect(screen.queryByText(/no differences/i)).not.toBeInTheDocument()
  })

  it('shows "No differences" once both texts are made identical', () => {
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Original text' }), 'same text')
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Changed text' }), 'same text')

    expect(screen.getByText(/no differences/i)).toBeInTheDocument()
  })

  it('marks added and removed lines in line mode', () => {
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Original text' }), 'a\nb')
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Changed text' }), 'a\nc')

    const result = screen.getByLabelText('Diff result')
    expect(within(result).getByText('b')).toBeInTheDocument()
    expect(within(result).getByText('c')).toBeInTheDocument()
  })

  it('switches to an inline word diff', async () => {
    const user = userEvent.setup()
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Original text' }), 'the quick fox')
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Changed text' }), 'the slow fox')

    await user.click(screen.getByRole('button', { name: 'Words' }))

    const result = screen.getByLabelText('Diff result')
    expect(within(result).getByText('quick')).toBeInTheDocument()
    expect(within(result).getByText('slow')).toBeInTheDocument()
  })

  it('swaps the original and changed text', async () => {
    // Deliberately uses the widget's own untouched sample text rather than
    // setCodeMirrorValue first — @uiw/react-codemirror debounces its next
    // controlled-value sync for ~200ms after any doc-changing transaction
    // (its "typing latch", see useCodeMirror.js), so a manual dispatch
    // immediately followed by this click would race that debounce.
    const user = userEvent.setup()
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    const original = screen.getByRole('textbox', { name: 'Original text' })
    const changed = screen.getByRole('textbox', { name: 'Changed text' })
    expect(original).toHaveTextContent('jumps')
    expect(changed).toHaveTextContent('leaps')

    await user.click(screen.getByRole('button', { name: /swap original and changed text/i }))

    expect(original).toHaveTextContent('leaps')
    expect(changed).toHaveTextContent('jumps')
  })
})
