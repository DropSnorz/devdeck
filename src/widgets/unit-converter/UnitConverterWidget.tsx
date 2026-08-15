import { useId, type ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/formatNumber'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import {
  LINEAR_CATEGORIES,
  TEMPERATURE_UNITS,
  convertLinear,
  convertTemperature,
  type LinearCategoryId,
  type TemperatureUnitId,
} from './unitConversions'

type CategoryId = LinearCategoryId | 'temperature'

const CATEGORY_OPTIONS: { label: string; value: CategoryId }[] = [
  { label: 'Length', value: 'length' },
  { label: 'Mass', value: 'mass' },
  { label: 'Volume', value: 'volume' },
  { label: 'Data', value: 'data' },
  { label: 'Temp', value: 'temperature' },
]

function unitsFor(category: CategoryId): { id: string; label: string }[] {
  return category === 'temperature' ? TEMPERATURE_UNITS : LINEAR_CATEGORIES[category].units
}

function parseNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

const DEFAULT_CATEGORY: CategoryId = 'length'
const DEFAULT_VALUE = '1'

export default function UnitConverterWidget({ instanceId }: WidgetProps) {
  const [category, setCategory] = useWidgetState<CategoryId>(instanceId, 'category', DEFAULT_CATEGORY)
  const [fromUnit, setFromUnit] = useWidgetState(instanceId, 'fromUnit', 'm')
  const [toUnit, setToUnit] = useWidgetState(instanceId, 'toUnit', 'ft')
  const [value, setValue] = useWidgetState(instanceId, 'value', DEFAULT_VALUE)
  useWidgetDirty(instanceId, category !== DEFAULT_CATEGORY || value !== DEFAULT_VALUE)
  const valueId = useId()
  const fromId = useId()
  const toId = useId()

  const handleCategoryChange = (next: CategoryId) => {
    setCategory(next)
    const units = unitsFor(next)
    setFromUnit(units[0].id)
    setToUnit(units[1]?.id ?? units[0].id)
  }

  const handleSwap = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  const parsedValue = parseNumber(value)
  const result = (() => {
    if (parsedValue === null) return null
    if (category === 'temperature') {
      return convertTemperature(parsedValue, fromUnit as TemperatureUnitId, toUnit as TemperatureUnitId)
    }
    const units = LINEAR_CATEGORIES[category].units
    const from = units.find((u) => u.id === fromUnit)
    const to = units.find((u) => u.id === toUnit)
    if (!from || !to) return null
    return convertLinear(parsedValue, from.toBase, to.toBase)
  })()
  const resultText = result !== null ? formatNumber(result) : null

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <SegmentedControl value={category} onChange={handleCategoryChange} options={CATEGORY_OPTIONS} className="flex-wrap" />

      <Field label="Value" htmlFor={valueId}>
        <Input
          id={valueId}
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="font-mono"
        />
      </Field>

      <div className="flex items-end gap-1.5">
        <Field label="From" htmlFor={fromId} className="min-w-0 flex-1">
          <UnitSelect id={fromId} value={fromUnit} onChange={setFromUnit} options={unitsFor(category)} />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleSwap}
          aria-label="Swap units"
          className="mb-0.5 shrink-0"
        >
          <ArrowLeftRight className="size-3.5" />
        </Button>
        <Field label="To" htmlFor={toId} className="min-w-0 flex-1">
          <UnitSelect id={toId} value={toUnit} onChange={setToUnit} options={unitsFor(category)} />
        </Field>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 rounded-md bg-background p-2 font-mono text-base dark:bg-muted/40">
        {resultText !== null ? (
          <span className="truncate">{resultText}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Enter a value</span>
        )}
        <CopyButton value={resultText ?? ''} label="" />
      </div>
    </div>
  )
}

function UnitSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
}): ReactNode {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
