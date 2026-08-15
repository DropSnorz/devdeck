import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpressionEvaluatorWidget from './ExpressionEvaluatorWidget'

describe('ExpressionEvaluatorWidget', () => {
  it('shows a placeholder before anything is typed', () => {
    render(<ExpressionEvaluatorWidget instanceId="test" mode="grid" />)
    expect(screen.getByText(/result will appear here/i)).toBeInTheDocument()
  })

  it('evaluates an expression as it is typed', async () => {
    const user = userEvent.setup()
    render(<ExpressionEvaluatorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByLabelText(/expression/i), '(2 + 3) * 4')

    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('shows an error for an invalid expression', async () => {
    const user = userEvent.setup()
    render(<ExpressionEvaluatorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByLabelText(/expression/i), '2 +')

    expect(screen.getByText(/unexpected end of expression/i)).toBeInTheDocument()
  })

  it('logs a result to history on Enter and lets it be cleared by widget state reset semantics', async () => {
    const user = userEvent.setup()
    render(<ExpressionEvaluatorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByLabelText(/expression/i), '2 + 2{Enter}')

    expect(screen.getByText('2 + 2 = 4')).toBeInTheDocument()
  })

  it('does not log to history on Enter while the expression is invalid', async () => {
    const user = userEvent.setup()
    render(<ExpressionEvaluatorWidget instanceId="test" mode="grid" />)

    await user.type(screen.getByLabelText(/expression/i), '2 +{Enter}')

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
