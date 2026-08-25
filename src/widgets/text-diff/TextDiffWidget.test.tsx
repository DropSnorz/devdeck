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
    // The nav cluster (and its buttons) has nothing to navigate between
    // once there are zero chunks — it's not just disabled, it isn't
    // rendered at all.
    expect(screen.queryByRole('button', { name: 'Next change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous change' })).not.toBeInTheDocument()
  })

  it('marks added and removed lines in line mode', () => {
    const { container } = render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Original text' }), 'a\nb')
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Changed text' }), 'a\nc')

    // A DOM-shape-agnostic check on purpose: CodeMirror renders each line
    // as its own `.cm-line`, and decorated changed text can split a line's
    // content across several child nodes — coupling this to that shape
    // (`getByText('b')` inside some specific container) would make the
    // test as brittle as CodeMirror's own internal markup. The actual
    // correctness question ("is chunk X really the added/removed one") is
    // covered without any DOM at all in mergeChunks.test.ts; this just
    // confirms the widget wires a real diff up to something on screen.
    expect(container).toHaveTextContent('a')
    expect(container).toHaveTextContent('b')
    expect(container).toHaveTextContent('c')
    expect(screen.getByText('Change 1 of 1')).toBeInTheDocument()
  })

  it('steps through multiple changes with the next/previous buttons, wrapping around', async () => {
    const user = userEvent.setup()
    render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(
      screen.getByRole('textbox', { name: 'Original text' }),
      'a\nb\nc\nd\ne\nf\ng',
    )
    setCodeMirrorValue(
      screen.getByRole('textbox', { name: 'Changed text' }),
      'x\nb\nc\nd\ny\nf\nz',
    )
    // setCodeMirrorValue leaves the cursor at the end of what it just typed
    // — on the "Original text" pane, that's inside the third (last) chunk,
    // so that's what "current" starts out as, not the first chunk.
    expect(screen.getByText('Change 3 of 3')).toBeInTheDocument()

    const next = screen.getByRole('button', { name: 'Next change' })
    // Wraps around past the last chunk instead of stopping there — handled
    // by @codemirror/merge's own goToNextChunk, not custom bounds logic
    // here.
    await user.click(next)
    expect(screen.getByText('Change 1 of 3')).toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText('Change 2 of 3')).toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText('Change 3 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous change' }))
    expect(screen.getByText('Change 2 of 3')).toBeInTheDocument()
  })

  it('collapses long unchanged runs in a large diff', () => {
    const original = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n')
    const changed = original.replace('line 125', 'CHANGED')
    const { container } = render(<TextDiffWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Original text' }), original)
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Changed text' }), changed)

    expect(screen.getByText('Change 1 of 1')).toBeInTheDocument()
    // An intentional exception to RTL's semantic-query preference —
    // collapsing unchanged runs so a single change in a large file doesn't
    // require scrolling through everything else is the literal feature
    // this widget rewrite exists to deliver, so it's worth a direct DOM
    // assertion rather than only testing it indirectly.
    expect(container.querySelector('.cm-collapsedLines')).toBeInTheDocument()
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
    // Uses the widget's own untouched sample text rather than
    // setCodeMirrorValue first — line mode (the default) swaps via a
    // direct dispatch on MergeDiffView's own EditorViews (see
    // MergeDiffView.tsx's `swap()`), not through @uiw/react-codemirror, so
    // there's no controlled-value sync debounce to race here. Kept as
    // untouched sample text anyway since it's the simplest fixture.
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
