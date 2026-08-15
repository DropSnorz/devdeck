import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PercentageCalculatorWidget from './PercentageCalculatorWidget'

describe('PercentageCalculatorWidget', () => {
  it('starts on "X% of Y" with the default inputs computed', () => {
    render(<PercentageCalculatorWidget instanceId="test" mode="grid" />)
    // 20% of 50 = 10
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('computes what percent one number is of another', async () => {
    const user = userEvent.setup()
    render(<PercentageCalculatorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /x is what % of y/i }))

    // defaults become Part=20, Whole=50 -> 40%
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('computes percent change, including a negative change', async () => {
    const user = userEvent.setup()
    render(<PercentageCalculatorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /% change/i }))
    await user.clear(screen.getByLabelText(/from/i))
    await user.type(screen.getByLabelText(/from/i), '80')
    await user.clear(screen.getByLabelText(/to/i))
    await user.type(screen.getByLabelText(/to/i), '60')

    expect(screen.getByText('-25%')).toBeInTheDocument()
  })

  it('does not tag the "X is Y% of ?" answer with a % sign — it answers in the same unit as the inputs', async () => {
    const user = userEvent.setup()
    render(<PercentageCalculatorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /x is y% of \?/i }))

    // defaults are Part=20, Percent=50 -> 20 is 50% of 40
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.queryByText('40%')).not.toBeInTheDocument()
  })

  it('reports division by zero instead of Infinity/NaN', async () => {
    const user = userEvent.setup()
    render(<PercentageCalculatorWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: /x is what % of y/i }))
    await user.clear(screen.getByLabelText(/whole/i))
    await user.type(screen.getByLabelText(/whole/i), '0')

    expect(screen.getByText(/can.t divide by zero/i)).toBeInTheDocument()
  })
})
