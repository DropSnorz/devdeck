export type TimerMode = 'clock' | 'stopwatch' | 'countdown'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "14:32:05" — always includes seconds, since a live clock without them
 * reads as frozen. */
export function formatClockTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Deterministic, locale-independent formatting (unlike `toLocaleDateString`
 * — see CronWidget's `formatAbsolute`) so both the UI and its tests agree on
 * the exact string regardless of the runner's locale. */
export function formatClockDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** `mm:ss.cc`, expanding to `h:mm:ss.cc` past one hour — centisecond
 * precision reads naturally for a running/paused stopwatch. */
export function formatStopwatchTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const centiseconds = Math.floor(clamped / 10) % 100
  const totalSeconds = Math.floor(clamped / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`
}

/** `mm:ss`, expanding to `h:mm:ss` past one hour. Rounds up to the next
 * second (`ceil`) rather than truncating, so a countdown reads "1:00" for
 * the entire final second instead of jumping straight to "0:59". */
export function formatCountdownTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`
}

export function durationFromParts(hours: number, minutes: number, seconds: number): number {
  return ((hours * 60 + minutes) * 60 + seconds) * 1000
}

/** Rounds and clamps a duration field (hours/minutes/seconds input) into
 * `[0, max]`, mirroring NumberField's own clamp so an out-of-range or
 * fractional value typed into the field never reaches persisted state. */
export function clampPart(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, Math.round(value)))
}

/** Elapsed time for the stopwatch: time accumulated across previous
 * run/pause segments, plus the live segment if currently running. */
export function computeStopwatchElapsedMs(
  state: { accumulatedMs: number; startedAt: number | null },
  now: number,
): number {
  return state.startedAt === null ? state.accumulatedMs : state.accumulatedMs + Math.max(0, now - state.startedAt)
}

/** Remaining time for the countdown: counts down toward `endAt` while
 * running, otherwise holds whatever was left when paused/reset. */
export function computeCountdownRemainingMs(
  state: { running: boolean; endAt: number | null; remainingMs: number },
  now: number,
): number {
  if (!state.running || state.endAt === null) return state.remainingMs
  return Math.max(0, state.endAt - now)
}
