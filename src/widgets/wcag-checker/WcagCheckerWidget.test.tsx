import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WcagCheckerWidget from './WcagCheckerWidget'

function textField() {
  return screen.getByLabelText(/^text$/i)
}
function backgroundField() {
  return screen.getByLabelText(/^background$/i)
}

describe('WcagCheckerWidget', () => {
  it('starts at black on white, passing every WCAG criterion at 21:1', () => {
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    expect(textField()).toHaveValue('#000000')
    expect(backgroundField()).toHaveValue('#ffffff')
    expect(screen.getByText('21.00:1')).toBeInTheDocument()
    expect(screen.getAllByText(/^(AA|AAA|UI components)/)).toHaveLength(5)
  })

  it('recomputes the ratio and pass/fail state when a hex value changes', async () => {
    const user = userEvent.setup()
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    await user.clear(textField())
    await user.type(textField(), '#767676')

    expect(screen.getByText('4.54:1')).toBeInTheDocument()
    expect(screen.getByText('AA — normal text').parentElement).toHaveClass('text-success')
    expect(screen.getByText('AAA — normal text').parentElement).toHaveClass('text-destructive')
  })

  it('swaps text and background colors', async () => {
    const user = userEvent.setup()
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    await user.clear(textField())
    await user.type(textField(), '#ff0000')

    await user.click(screen.getByRole('button', { name: /swap text and background colors/i }))

    expect(textField()).toHaveValue('#ffffff')
    expect(backgroundField()).toHaveValue('#ff0000')
  })

  it('leaves the ratio unchanged while a hex value is invalid/in progress', async () => {
    const user = userEvent.setup()
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    await user.clear(textField())
    await user.type(textField(), 'not-a-color')

    expect(textField()).toHaveValue('not-a-color')
    expect(screen.getByText('21.00:1')).toBeInTheDocument()
  })

  it('shows both picker buttons for each color, disabled where the browser lacks the underlying API', () => {
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    expect(screen.getAllByRole('button', { name: /pick color from page/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /pick color from screen/i })).toHaveLength(2)
    for (const button of screen.getAllByRole('button', { name: /pick color from (page|screen)/i })) {
      expect(button).toBeDisabled()
    }
  })

  it('copies the formatted contrast ratio', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<WcagCheckerWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /copy contrast ratio/i }))

    expect(writeText).toHaveBeenCalledWith('21.00:1')
  })
})
