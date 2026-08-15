import { useId } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/formatNumber'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { findWhole, percentChange, percentOf, whatPercent } from './percentageCalculations'

type Mode = 'of' | 'isWhatPercent' | 'isPercentOf' | 'change'

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: 'X% of Y', value: 'of' },
  { label: 'X is what % of Y', value: 'isWhatPercent' },
  { label: 'X is Y% of ?', value: 'isPercentOf' },
  { label: '% change', value: 'change' },
]

const MODE_FIELD_LABELS: Record<Mode, [string, string]> = {
  of: ['Percent', 'Of value'],
  isWhatPercent: ['Part', 'Whole'],
  isPercentOf: ['Part', 'Percent'],
  change: ['From', 'To'],
}

const DEFAULT_MODE: Mode = 'of'
const DEFAULT_INPUT_1 = '20'
const DEFAULT_INPUT_2 = '50'

function parseNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function compute(mode: Mode, a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null
  switch (mode) {
    case 'of':
      return percentOf(a, b)
    case 'isWhatPercent':
      return whatPercent(a, b)
    case 'isPercentOf':
      return findWhole(a, b)
    case 'change':
      return percentChange(a, b)
  }
}

export default function PercentageCalculatorWidget({ instanceId }: WidgetProps) {
  const [mode, setMode] = useWidgetState<Mode>(instanceId, 'mode', DEFAULT_MODE)
  const [input1, setInput1] = useWidgetState(instanceId, 'input1', DEFAULT_INPUT_1)
  const [input2, setInput2] = useWidgetState(instanceId, 'input2', DEFAULT_INPUT_2)
  useWidgetDirty(
    instanceId,
    mode !== DEFAULT_MODE || input1 !== DEFAULT_INPUT_1 || input2 !== DEFAULT_INPUT_2,
  )
  const id1 = useId()
  const id2 = useId()

  const [label1, label2] = MODE_FIELD_LABELS[mode]
  const a = parseNumber(input1)
  const b = parseNumber(input2)
  const bothEntered = a !== null && b !== null
  const result = compute(mode, a, b)
  const resultText = result !== null ? formatNumber(result) : null
  // Only "X is what % of Y" and "% change" actually answer in percent —
  // "X% of Y" and "X is Y% of ?" both answer in the same unit as the
  // inputs, so tagging those with "%" would misrepresent the number.
  const displaysPercent = mode === 'isWhatPercent' || mode === 'change'
  const displayText = resultText !== null ? (displaysPercent ? `${resultText}%` : resultText) : null

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <SegmentedControl value={mode} onChange={setMode} options={MODE_OPTIONS} className="flex-wrap" />

      <div className="flex items-center gap-2">
        <Field label={label1} htmlFor={id1} className="flex-1">
          <Input
            id={id1}
            type="number"
            value={input1}
            onChange={(event) => setInput1(event.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label={label2} htmlFor={id2} className="flex-1">
          <Input
            id={id2}
            type="number"
            value={input2}
            onChange={(event) => setInput2(event.target.value)}
            className="font-mono"
          />
        </Field>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 rounded-md bg-background p-2 font-mono text-base dark:bg-muted/40">
        {!bothEntered ? (
          <span className="text-sm text-muted-foreground">Enter both values</span>
        ) : displayText !== null ? (
          <span>{displayText}</span>
        ) : (
          <ErrorMessage>Can&rsquo;t divide by zero</ErrorMessage>
        )}
        <CopyButton value={displayText ?? ''} label="" />
      </div>
    </div>
  )
}
