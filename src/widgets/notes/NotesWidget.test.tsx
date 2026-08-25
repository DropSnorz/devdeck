import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotesWidget from './NotesWidget'
import { setCodeMirrorValue } from '@/test/codemirror'

/** Mirrors StatisticsCalculatorWidget's own test helper — several labels
 * can share a value (e.g. both zero), so scope each assertion to its row
 * rather than asserting the value text is unique on the page. */
function statValue(label: string): string | null {
  const labelEl = screen.getByText(label)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`no row found for label "${label}"`)
  return within(row).getAllByText(/./).at(-1)?.textContent ?? null
}

describe('NotesWidget', () => {
  it('starts with the statistics panel collapsed', () => {
    render(<NotesWidget instanceId="test" mode="grid" />)

    expect(screen.queryByText('Characters')).not.toBeInTheDocument()
  })

  it('starts empty with every statistic at zero, once expanded', async () => {
    const user = userEvent.setup()
    render(<NotesWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Statistics' }))

    expect(statValue('Characters')).toBe('0')
    expect(statValue('Words')).toBe('0')
    expect(statValue('Lines')).toBe('0')
    expect(statValue('Paragraphs')).toBe('0')
    expect(statValue('Sentences')).toBe('0')
    expect(statValue('Reading time')).toBe('0 min')
  })

  it('recomputes statistics as the note is edited', async () => {
    const user = userEvent.setup()
    render(<NotesWidget instanceId="test" mode="grid" />)

    await user.click(screen.getByRole('button', { name: 'Statistics' }))
    setCodeMirrorValue(screen.getByRole('textbox', { name: 'Notes' }), 'The quick brown fox\njumps over the lazy dog.')

    expect(statValue('Characters')).toBe('44')
    expect(statValue('No spaces')).toBe('36')
    expect(statValue('Words')).toBe('9')
    expect(statValue('Lines')).toBe('2')
    expect(statValue('Sentences')).toBe('1')
    expect(statValue('Reading time')).toBe('1 min')
  })

  it('toggles the statistics rows open and closed', async () => {
    const user = userEvent.setup()
    render(<NotesWidget instanceId="test" mode="grid" />)

    expect(screen.queryByText('Characters')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Statistics' }))

    expect(screen.getByText('Characters')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Statistics' }))

    expect(screen.queryByText('Characters')).not.toBeInTheDocument()
  })
})
