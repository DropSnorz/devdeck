import { useState } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

type Unit = 'seconds' | 'milliseconds'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalDatetimeInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function epochFromUnit(value: number, unit: Unit): number {
  return unit === 'seconds' ? value * 1000 : value
}

function unitFromEpochMs(ms: number, unit: Unit): number {
  return unit === 'seconds' ? Math.floor(ms / 1000) : ms
}

export default function TimestampConverterWidget({ instanceId }: WidgetProps) {
  const [unit, setUnit] = useState<Unit>('seconds')
  const [epochInput, setEpochInput] = useState(() =>
    String(unitFromEpochMs(Date.now(), 'seconds')),
  )
  const [dateInput, setDateInput] = useState(() =>
    toLocalDatetimeInputValue(new Date()),
  )
  // "Now" isn't a fixed default to diff against — capture the mount-time
  // value once instead (state, not a ref: refs can't be read during render).
  const [initialEpoch] = useState(epochInput)
  useWidgetDirty(instanceId, epochInput !== initialEpoch)

  const epochMs = (() => {
    const n = Number(epochInput)
    return Number.isFinite(n) ? epochFromUnit(n, unit) : null
  })()
  const date = epochMs !== null ? new Date(epochMs) : null
  const isValid = date !== null && !Number.isNaN(date.getTime())

  const handleEpochChange = (value: string) => {
    setEpochInput(value)
    const n = Number(value)
    if (Number.isFinite(n)) {
      const d = new Date(epochFromUnit(n, unit))
      if (!Number.isNaN(d.getTime())) setDateInput(toLocalDatetimeInputValue(d))
    }
  }

  const handleDateChange = (value: string) => {
    setDateInput(value)
    const d = new Date(value)
    if (!Number.isNaN(d.getTime()))
      setEpochInput(String(unitFromEpochMs(d.getTime(), unit)))
  }

  const handleUnitChange = (nextUnit: Unit) => {
    if (isValid && date)
      setEpochInput(String(unitFromEpochMs(date.getTime(), nextUnit)))
    setUnit(nextUnit)
  }

  const handleNow = () => {
    const now = new Date()
    setDateInput(toLocalDatetimeInputValue(now))
    setEpochInput(String(unitFromEpochMs(now.getTime(), unit)))
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          value={unit}
          onChange={handleUnitChange}
          options={[
            { label: 'Seconds', value: 'seconds' },
            { label: 'Milliseconds', value: 'milliseconds' },
          ]}
        />
        <button
          type="button"
          onClick={handleNow}
          className="rounded-md bg-slate-900 px-2 py-1 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Now
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-slate-500 dark:text-slate-400">Epoch</span>
        <div className="flex items-center gap-1">
          <input
            value={epochInput}
            onChange={(event) => handleEpochChange(event.target.value)}
            spellCheck={false}
            className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
          />
          <CopyButton value={epochInput} label="" />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-slate-500 dark:text-slate-400">
          Local date/time
        </span>
        <input
          type="datetime-local"
          step={1}
          value={dateInput}
          onChange={(event) => handleDateChange(event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
        />
      </label>

      {isValid && date ? (
        <div className="mt-auto space-y-0.5 rounded-md bg-slate-50 p-2 font-mono text-[11px] text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
          <p>UTC: {date.toUTCString()}</p>
          <p>ISO: {date.toISOString()}</p>
        </div>
      ) : (
        <p className="text-red-600 dark:text-red-400">Invalid timestamp</p>
      )}
    </div>
  )
}
