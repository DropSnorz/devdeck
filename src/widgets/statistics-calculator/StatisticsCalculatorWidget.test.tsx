import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatisticsCalculatorWidget from './StatisticsCalculatorWidget'

/** Stat rows repeat the same value across several labels for a small
 * list (e.g. mean == median == range), so scope each assertion to its own
 * row instead of asserting the value text is unique on the page. */
function statValue(label: string): string | null {
  const labelEl = screen.getByText(label)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`no row found for label "${label}"`)
  return within(row).getAllByText(/./).at(-1)?.textContent ?? null
}

describe('StatisticsCalculatorWidget', () => {
  it('computes statistics for the default sample list', () => {
    render(<StatisticsCalculatorWidget instanceId="test" mode="grid" />)

    expect(statValue('Count')).toBe('6')
    expect(statValue('Sum')).toBe('108')
    expect(statValue('Mean')).toBe('18')
    expect(statValue('Median')).toBe('15.5')
    expect(statValue('Mode')).toBe('—')
  })

  it('recomputes as the list is edited', async () => {
    const user = userEvent.setup()
    render(<StatisticsCalculatorWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByLabelText(/number list/i))
    await user.type(screen.getByLabelText(/number list/i), '1, 2, 3')

    expect(statValue('Count')).toBe('3')
    expect(statValue('Mean')).toBe('2')
    expect(statValue('Median')).toBe('2')
    expect(statValue('Variance')).toBe('1')
  })

  it('finds a repeated mode', async () => {
    const user = userEvent.setup()
    render(<StatisticsCalculatorWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByLabelText(/number list/i))
    await user.type(screen.getByLabelText(/number list/i), '1, 2, 2, 3')

    expect(statValue('Mode')).toBe('2')
  })

  it('shows a placeholder instead of stats when there are no numbers', async () => {
    const user = userEvent.setup()
    render(<StatisticsCalculatorWidget instanceId="test" mode="grid" />)

    await user.clear(screen.getByLabelText(/number list/i))

    expect(screen.getByText(/enter at least one number/i)).toBeInTheDocument()
  })
})
