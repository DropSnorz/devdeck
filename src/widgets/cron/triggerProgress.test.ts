import { describe, expect, it } from 'vitest'
import { getTriggerProgress } from './triggerProgress'

describe('getTriggerProgress', () => {
  it('matches the worked "every minute" example: 1/3, 2/3, 3/3 right at the anchor', () => {
    const anchor = new Date(2024, 0, 1, 10, 0, 0)
    const occurrences = [
      new Date(2024, 0, 1, 10, 1, 0),
      new Date(2024, 0, 1, 10, 2, 0),
      new Date(2024, 0, 1, 10, 3, 0),
    ]
    const progress = getTriggerProgress(occurrences, anchor, anchor)
    expect(progress[0]).toBeCloseTo(1 / 3)
    expect(progress[1]).toBeCloseTo(2 / 3)
    expect(progress[2]).toBeCloseTo(3 / 3)
  })

  it('each fraction hits exactly 0 the instant its own trigger arrives, shifting the others down', () => {
    const anchor = new Date(2024, 0, 1, 10, 0, 0)
    const occurrences = [
      new Date(2024, 0, 1, 10, 1, 0),
      new Date(2024, 0, 1, 10, 2, 0),
      new Date(2024, 0, 1, 10, 3, 0),
    ]
    // "now" == the first trigger's own instant.
    const progress = getTriggerProgress(occurrences, anchor, occurrences[0])
    expect(progress[0]).toBeCloseTo(0)
    expect(progress[1]).toBeCloseTo(1 / 3)
    expect(progress[2]).toBeCloseTo(2 / 3)
  })

  it('clamps to 0 for a trigger that has already passed', () => {
    const anchor = new Date(2024, 0, 1, 10, 0, 0)
    const occurrences = [new Date(2024, 0, 1, 10, 1, 0)]
    const past = new Date(2024, 0, 1, 10, 5, 0)
    expect(getTriggerProgress(occurrences, anchor, past)[0]).toBe(0)
  })

  it('scales proportionally to real (uneven) gaps rather than assuming equal spacing', () => {
    const anchor = new Date(2024, 0, 1, 10, 0, 0)
    // 1 minute to the first trigger, 10 minutes to the last — an irregular
    // expression's real spacing, not the evenly-spaced example above.
    const occurrences = [
      new Date(2024, 0, 1, 10, 1, 0),
      new Date(2024, 0, 1, 10, 10, 0),
    ]
    const progress = getTriggerProgress(occurrences, anchor, anchor)
    expect(progress[0]).toBeCloseTo(1 / 10)
    expect(progress[1]).toBeCloseTo(1)
  })

  it('returns an empty array for no occurrences', () => {
    expect(getTriggerProgress([], new Date(), new Date())).toEqual([])
  })

  it('returns all zeros rather than dividing by zero when the window has no span', () => {
    const anchor = new Date(2024, 0, 1, 10, 0, 0)
    const occurrences = [anchor, anchor]
    expect(getTriggerProgress(occurrences, anchor, anchor)).toEqual([0, 0])
  })
})
