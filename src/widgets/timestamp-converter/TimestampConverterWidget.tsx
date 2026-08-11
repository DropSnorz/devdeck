import { useId } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
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
  const [unit, setUnit] = useWidgetState<Unit>(instanceId, 'unit', 'seconds')
  const [epochInput, setEpochInput] = useWidgetState(instanceId, 'epochInput', () =>
    String(unitFromEpochMs(Date.now(), 'seconds')),
  )
  const [dateInput, setDateInput] = useWidgetState(instanceId, 'dateInput', () =>
    toLocalDatetimeInputValue(new Date()),
  )
  // "Now" isn't a fixed default to diff against — capture the mount-time
  // value once instead (state, not a ref: refs can't be read during render).
  const [initialEpoch] = useWidgetState(instanceId, 'initialEpoch', epochInput)
  useWidgetDirty(instanceId, epochInput !== initialEpoch)
  const epochFieldId = useId()
  const dateFieldId = useId()

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
        <Button
          type="button"
          size="sm"
          onClick={handleNow}
          className="h-auto rounded-md px-2 py-1"
        >
          Now
        </Button>
      </div>

      <Field label="Epoch" htmlFor={epochFieldId}>
        <div className="flex items-center gap-1">
          <Input
            id={epochFieldId}
            value={epochInput}
            onChange={(event) => handleEpochChange(event.target.value)}
            spellCheck={false}
            className="w-full font-mono"
          />
          <CopyButton value={epochInput} label="" />
        </div>
      </Field>

      <Field label="Local date/time" htmlFor={dateFieldId}>
        <Input
          id={dateFieldId}
          type="datetime-local"
          step={1}
          value={dateInput}
          onChange={(event) => handleDateChange(event.target.value)}
          className="w-full font-mono"
        />
      </Field>

      {isValid && date ? (
        <div className="mt-auto space-y-0.5 rounded-md bg-background p-2 font-mono text-[11px] text-foreground dark:bg-muted/40">
          <p>UTC: {date.toUTCString()}</p>
          <p>ISO: {date.toISOString()}</p>
        </div>
      ) : (
        <ErrorMessage>Invalid timestamp</ErrorMessage>
      )}
    </div>
  )
}
