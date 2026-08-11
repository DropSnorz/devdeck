import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import {
  CronParseError,
  getNextOccurrences,
  getPreviousOccurrence,
  parseCron,
} from './cronParser'
import { describeCron } from './describeCron'
import { formatRelativeTime } from './relativeTime'
import { getTriggerProgress } from './triggerProgress'

const DEFAULT_EXPRESSION = '*/5 * * * *'

const PRESETS: { label: string; expression: string }[] = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Hourly', expression: '0 * * * *' },
  { label: 'Daily', expression: '0 0 * * *' },
  { label: 'Weekdays 9am', expression: '0 9 * * 1-5' },
]

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Deterministic, locale-independent formatting (unlike `toLocaleString`)
 * so both the UI and its tests agree on the exact string regardless of the
 * runner's locale. */
function formatAbsolute(date: Date): string {
  const weekday = WEEKDAYS_SHORT[date.getDay()]
  return `${weekday} ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function CronWidget({ instanceId }: WidgetProps) {
  const [expression, setExpression] = useWidgetState(
    instanceId,
    'expression',
    DEFAULT_EXPRESSION,
  )
  useWidgetDirty(instanceId, expression !== DEFAULT_EXPRESSION)

  // Ticks once a second purely to keep the "in 2d" / "in 5s" labels (and the
  // occurrence list itself, once the soonest trigger passes) live.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { fields, error } = useMemo(() => {
    try {
      return { fields: parseCron(expression), error: null as string | null }
    } catch (err) {
      return {
        fields: null,
        error:
          err instanceof CronParseError
            ? err.message
            : 'Invalid cron expression',
      }
    }
  }, [expression])

  const description = fields ? describeCron(fields) : null
  const occurrences = useMemo(
    () => (fields ? getNextOccurrences(fields, { count: 3, from: now }) : []),
    [fields, now],
  )

  // Anchors the progress bars' shared countdown window at the trigger
  // immediately *before* the soonest upcoming one. Adjusted during render
  // (React's documented pattern for "derived state that resets when an
  // input changes" — see https://react.dev/learn/you-might-not-need-an-effect)
  // rather than in an effect, so there's no extra post-commit render pass.
  // It only reacts to the expression changing (a fresh window) or the
  // soonest trigger firing and the list rotating (that trigger becomes the
  // new anchor) — never to the once-a-second `now` tick — so this stays
  // effectively free.
  const [windowAnchor, setWindowAnchor] = useState<Date | null>(null)
  const [trackedExpression, setTrackedExpression] = useState<string | null>(
    null,
  )
  const [trackedFirstMs, setTrackedFirstMs] = useState<number | null>(null)
  const firstOccurrenceMs = occurrences[0]?.getTime() ?? null

  if (!fields || occurrences.length === 0) {
    if (windowAnchor !== null) setWindowAnchor(null)
    if (trackedExpression !== null) setTrackedExpression(null)
    if (trackedFirstMs !== null) setTrackedFirstMs(null)
  } else if (trackedExpression !== expression) {
    setWindowAnchor(
      getPreviousOccurrence(fields, occurrences[0]) ??
        new Date(occurrences[0].getTime() - 60_000),
    )
    setTrackedExpression(expression)
    setTrackedFirstMs(firstOccurrenceMs)
  } else if (trackedFirstMs !== null && firstOccurrenceMs !== trackedFirstMs) {
    setWindowAnchor(new Date(trackedFirstMs))
    setTrackedFirstMs(firstOccurrenceMs)
  }

  const progress = useMemo(
    () =>
      windowAnchor ? getTriggerProgress(occurrences, windowAnchor, now) : [],
    [occurrences, windowAnchor, now],
  )

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-slate-500 dark:text-slate-400">
          Cron expression
        </span>
        <div className="flex items-center gap-1">
          <input
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            placeholder="* * * * *"
            spellCheck={false}
            className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
          />
          <CopyButton value={expression} label="" />
        </div>
      </label>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setExpression(preset.expression)}
            className="rounded bg-slate-100 px-1.5 py-1 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <p className="font-medium text-slate-700 dark:text-slate-200">
          {description}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
        {!error && occurrences.length === 0 && (
          <p className="p-2 text-slate-400">
            No upcoming trigger found in the next 5 years.
          </p>
        )}
        {!error &&
          occurrences.map((date, index) => (
            <div
              key={date.getTime()}
              className={`px-2 py-1.5 ${
                index > 0
                  ? 'border-t border-slate-200 dark:border-slate-800'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {formatAbsolute(date)}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {formatRelativeTime(date, now)}
                </span>
              </div>
              {/* Countdown toward this trigger, relative to the shared
                  3-trigger window — see triggerProgress.ts. Purely
                  decorative (the relative-time chip above already states
                  this), so hidden from assistive tech. Width updates once a
                  second; the CSS transition interpolates the motion between
                  ticks instead of a JS animation loop. */}
              <div
                aria-hidden="true"
                className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-slate-900 transition-[width] duration-1000 ease-linear motion-reduce:transition-none dark:bg-slate-100"
                  style={{ width: `${(progress[index] ?? 0) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
