import { describe, expect, it } from 'vitest'
import { parseCron } from './cronParser'
import { describeCron } from './describeCron'

function describe_(expression: string): string {
  return describeCron(parseCron(expression))
}

describe('describeCron', () => {
  it('describes every minute, every day', () => {
    expect(describe_('* * * * *')).toBe('Every minute, every day')
  })

  it('describes a bare minute step', () => {
    expect(describe_('*/5 * * * *')).toBe('Every 5 minutes, every day')
    expect(describe_('*/15 * * * *')).toBe('Every 15 minutes, every day')
  })

  it('describes a single exact time as a clock time', () => {
    expect(describe_('30 4 * * *')).toBe('At 04:30, every day')
    expect(describe_('0 0 * * *')).toBe('At 00:00, every day')
  })

  it('describes a specific minute of every hour', () => {
    expect(describe_('15 * * * *')).toBe(
      'At minute 15 of every hour, every day',
    )
  })

  it('describes a list of minutes of every hour', () => {
    expect(describe_('0,30 * * * *')).toBe(
      'At minute 0 and 30 of every hour, every day',
    )
  })

  it('describes a restricted day-of-week', () => {
    expect(describe_('0 9 * * 1-5')).toBe(
      'At 09:00, on Monday, Tuesday, Wednesday, Thursday and Friday',
    )
  })

  it('describes a single weekday', () => {
    expect(describe_('0 9 * * 1')).toBe('At 09:00, on Monday')
  })

  it('describes a specific day of the month', () => {
    expect(describe_('0 0 1 * *')).toBe('At 00:00, on day 1 of the month')
  })

  it('describes a restricted month', () => {
    expect(describe_('0 0 1 1 *')).toBe(
      'At 00:00, in January, on day 1 of the month',
    )
  })

  it('describes a list of months', () => {
    expect(describe_('0 0 * JAN,DEC *')).toBe(
      'At 00:00, in January and December',
    )
  })
})
