import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogViewerWidget from './LogViewerWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

describe('LogViewerWidget', () => {
  it('renders the sample log with its pattern chips already counted', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    expect(screen.getByRole('textbox', { name: 'Log input' })).toHaveTextContent('booting service')
    expect(screen.getByRole('button', { name: /error \(3\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /warning \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /critical.*\(1\)/i })).toBeInTheDocument()
    // 2: standalone "Exception:" plus the embedded one in "NullPointerException".
    expect(screen.getByRole('button', { name: /exception \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /timeout \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /denied.*\(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry.*\(1\)/i })).toBeInTheDocument()
  })

  it('disables a chip that has no matches', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'error one\nerror two')
    expect(screen.getByRole('button', { name: /retry.*\(0\)/i })).toBeDisabled()
  })

  it('counts and highlights a pattern word embedded in a PascalCase exception name', () => {
    const { container } = render(<LogViewerWidget instanceId="test" mode="grid" />)
    setCodeMirrorValue(
      screen.getByRole('textbox', { name: 'Log input' }),
      'threw a FatalError while handling CustomException',
    )

    expect(screen.getByRole('button', { name: /critical.*\(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exception \(1\)/i })).toBeInTheDocument()
    // Confirm the decorated span covers just the embedded word.
    const severeSpans = Array.from(container.querySelectorAll('.cm-log-severe')).map((el) => el.textContent)
    expect(severeSpans).toContain('Fatal')
    expect(severeSpans).toContain('Exception')
  })

  it('never renders a disabled chip as pressed, even one toggled on before its matches disappeared', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    // "retry" is toggled on by default. Zeroing its matches must not leave
    // it disabled *and* pressed (the bold variant at 50% opacity).
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'error one\nerror two')
    const retryChip = screen.getByRole('button', { name: /retry.*\(0\)/i })
    expect(retryChip).toBeDisabled()
    expect(retryChip).toHaveAttribute('aria-pressed', 'false')

    // Bringing a match back reinstates it as pressed, no click needed.
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'error one\nretry once')
    expect(screen.getByRole('button', { name: /retry.*\(1\)/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects every pattern with a match by default, pooling all their matches in the navigator', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    expect(screen.getByRole('button', { name: /error \(3\)/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /critical.*\(1\)/i })).toHaveAttribute('aria-pressed', 'true')
    // critical 1 + error 3 + exception 2 + warning 2 + failure 1 + timeout 1 + denied 1 + retry 1 = 12.
    expect(screen.getByText('1 of 12')).toBeInTheDocument()
  })

  it('toggling a pattern off removes its matches from the pooled navigator, toggling it back on restores them', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    expect(screen.getByText('1 of 12')).toBeInTheDocument()

    const errorChip = screen.getByRole('button', { name: /error \(3\)/i })
    await user.click(errorChip)
    expect(errorChip).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('1 of 9')).toBeInTheDocument()

    await user.click(errorChip)
    expect(errorChip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 of 12')).toBeInTheDocument()
  })

  it('steps through the pooled matches of every toggled-on pattern together, wrapping around', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    // error, warning, and critical are all still toggled on from the default.
    setCodeMirrorValue(
      screen.getByRole('textbox', { name: 'Log input' }),
      'error one\nwarning one\nwarning two\ncritical one',
    )
    expect(screen.getByText('1 of 4')).toBeInTheDocument()

    const next = screen.getByRole('button', { name: 'Next match' })
    await user.click(next)
    expect(screen.getByText('2 of 4')).toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText('3 of 4')).toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText('4 of 4')).toBeInTheDocument()

    // Wraps back around to the first match past the last one.
    await user.click(next)
    expect(screen.getByText('1 of 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous match' }))
    expect(screen.getByText('4 of 4')).toBeInTheDocument()
  })

  it('recombines the navigator as multiple patterns are toggled independently', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'error one\nwarning one\nwarning two')
    expect(screen.getByText('1 of 3')).toBeInTheDocument()

    const errorChip = screen.getByRole('button', { name: /error \(1\)/i })
    const warningChip = screen.getByRole('button', { name: /warning \(2\)/i })

    await user.click(warningChip)
    expect(warningChip).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('1 of 1')).toBeInTheDocument()

    await user.click(errorChip)
    expect(errorChip).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Next match' })).not.toBeInTheDocument()

    await user.click(warningChip)
    expect(warningChip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('starts pressed since every pattern with a match is already selected by default', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)
    expect(screen.getByRole('button', { name: 'Deselect all patterns' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('deselects every pattern at once, then reselects them all', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    const toggleAll = screen.getByRole('button', { name: 'Deselect all patterns' })
    await user.click(toggleAll)

    expect(screen.getByRole('button', { name: /error \(3\)/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /critical.*\(1\)/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Next match' })).not.toBeInTheDocument()
    expect(toggleAll).toHaveAttribute('aria-label', 'Select all patterns')

    await user.click(toggleAll)
    expect(screen.getByRole('button', { name: /error \(3\)/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /critical.*\(1\)/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 of 12')).toBeInTheDocument()
  })

  it('selects every enabled pattern even after some were individually toggled off', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    const errorChip = screen.getByRole('button', { name: /error \(3\)/i })
    await user.click(errorChip)
    expect(errorChip).toHaveAttribute('aria-pressed', 'false')

    const toggleAll = screen.getByRole('button', { name: 'Select all patterns' })
    await user.click(toggleAll)

    expect(errorChip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 of 12')).toBeInTheDocument()
  })

  it('disables select-all/deselect-all once nothing has any matches', () => {
    render(<LogViewerWidget instanceId="test" mode="grid" />)
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'nothing interesting here')
    expect(screen.getByRole('button', { name: 'Select all patterns' })).toBeDisabled()
  })

  it('disables "Hide non-matching lines" once nothing is toggled on', async () => {
    const user = userEvent.setup()
    render(<LogViewerWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'nothing interesting here')
    expect(screen.getByRole('button', { name: 'Hide non-matching lines' })).toBeDisabled()

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'error one')
    const hideButton = screen.getByRole('button', { name: 'Hide non-matching lines' })
    expect(hideButton).toBeEnabled()
    await user.click(hideButton)
    expect(hideButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('folds lines outside the context window once "Hide non-matching lines" is on', async () => {
    const user = userEvent.setup()
    const { container } = render(<LogViewerWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'line1\nline2\nERROR line3\nline4\nline5')
    await user.click(screen.getByRole('button', { name: 'Hide non-matching lines' }))

    // Context 1 keeps line2/ERROR line3/line4, folds line1 and line5 separately.
    expect(container.querySelectorAll('.cm-log-fold-placeholder')).toHaveLength(2)
    expect(container).not.toHaveTextContent('line1')
    expect(container).toHaveTextContent('line2')
    expect(container).toHaveTextContent('ERROR line3')
    expect(container).toHaveTextContent('line4')
    expect(container).not.toHaveTextContent('line5')
  })

  it('refolds immediately when the context line count changes', async () => {
    const user = userEvent.setup()
    const { container } = render(<LogViewerWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'line1\nline2\nERROR line3\nline4\nline5')
    await user.click(screen.getByRole('button', { name: 'Hide non-matching lines' }))
    expect(container).toHaveTextContent('line2')

    const contextInput = screen.getByLabelText('Context')
    await user.clear(contextInput)
    await user.type(contextInput, '0')

    expect(container).not.toHaveTextContent('line2')
    expect(container).toHaveTextContent('ERROR line3')
    expect(container).not.toHaveTextContent('line4')
  })

  it('unfolds everything again when "Hide non-matching lines" is toggled back off', async () => {
    const user = userEvent.setup()
    const { container } = render(<LogViewerWidget instanceId="test" mode="grid" />)

    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'line1\nline2\nERROR line3\nline4\nline5')
    const hideButton = screen.getByRole('button', { name: 'Hide non-matching lines' })
    await user.click(hideButton)
    expect(container).not.toHaveTextContent('line1')

    await user.click(hideButton)
    expect(container.querySelectorAll('.cm-log-fold-placeholder')).toHaveLength(0)
    expect(container).toHaveTextContent('line1')
    expect(container).toHaveTextContent('line5')
  })

  it('does not throw when a lone blank line would otherwise fold to a zero-length range', async () => {
    const user = userEvent.setup()
    const { container } = render(<LogViewerWidget instanceId="test" mode="grid" />)

    // A blank line between two matches, at context 0, used to crash
    // CodeMirror ("Invalid range for replacement decoration").
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Log input' }), 'ERROR one\n\nERROR two')
    await user.click(screen.getByRole('button', { name: 'Hide non-matching lines' }))

    const contextInput = screen.getByLabelText('Context')
    await user.clear(contextInput)
    await user.type(contextInput, '0')

    expect(container).toHaveTextContent('ERROR one')
    expect(container).toHaveTextContent('ERROR two')
  })
})
