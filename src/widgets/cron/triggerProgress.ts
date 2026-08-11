/** Turns a list of upcoming trigger times into a countdown fraction per
 * trigger, all measured against one shared window — `anchor` (the real
 * previous occurrence) through the last previewed trigger — rather than
 * each trigger's own local gap. That's what makes the fractions line up
 * the way a human expects to see them stack: for an evenly-spaced "every
 * minute" schedule sampled right at the anchor, three previewed triggers
 * read 1/3, 2/3, 3/3, and every one of them counts down to exactly 0 the
 * instant it fires — see cronParser.test.ts and CronWidget.test.tsx for
 * the worked example. An irregular expression (unevenly spaced triggers)
 * still animates proportionally to its own real gaps, because `anchor`
 * comes from `getPreviousOccurrence` rather than an assumed even spacing. */
export function getTriggerProgress(
  occurrences: Date[],
  anchor: Date,
  now: Date,
): number[] {
  if (occurrences.length === 0) return []

  const last = occurrences[occurrences.length - 1]
  const totalSpanMs = last.getTime() - anchor.getTime()
  if (totalSpanMs <= 0) return occurrences.map(() => 0)

  return occurrences.map((date) => {
    const remainingMs = date.getTime() - now.getTime()
    return Math.min(1, Math.max(0, remainingMs / totalSpanMs))
  })
}
