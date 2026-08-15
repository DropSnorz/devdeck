import { useId } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { NumberField } from '@/components/NumberField'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { COMMON_BASES, formatInBase, parseInBase } from './baseConversion'

const DEFAULT_VALUE = '255'
const DEFAULT_INPUT_BASE = 10
const DEFAULT_CUSTOM_BASE = 36

export default function NumberBaseConverterWidget({ instanceId }: WidgetProps) {
  const [inputValue, setInputValue] = useWidgetState(instanceId, 'inputValue', DEFAULT_VALUE)
  const [inputBase, setInputBase] = useWidgetState(instanceId, 'inputBase', DEFAULT_INPUT_BASE)
  const [customBase, setCustomBase] = useWidgetState(instanceId, 'customBase', DEFAULT_CUSTOM_BASE)
  useWidgetDirty(
    instanceId,
    inputValue !== DEFAULT_VALUE || inputBase !== DEFAULT_INPUT_BASE || customBase !== DEFAULT_CUSTOM_BASE,
  )
  const valueId = useId()

  const parsed = parseInBase(inputValue, inputBase)
  const hasError = inputValue.trim() !== '' && parsed === null

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-end gap-2">
        <Field label="Value" htmlFor={valueId} className="flex-1">
          <Input
            id={valueId}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            spellCheck={false}
            className="font-mono"
          />
        </Field>
        <NumberField label="From base" value={inputBase} min={2} max={36} onChange={setInputBase} />
      </div>
      {hasError && <ErrorMessage>Invalid digit for base {inputBase}</ErrorMessage>}

      <div className="min-h-16 flex-1 space-y-0.5 overflow-auto">
        {COMMON_BASES.map(({ label, base }) => (
          <BaseRow
            key={base}
            label={`${label} (${base})`}
            value={parsed !== null ? formatInBase(parsed, base) : ''}
          />
        ))}
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-2">
        <NumberField label="Custom base" value={customBase} min={2} max={36} onChange={setCustomBase} />
        <BaseRow
          label={`Base ${customBase}`}
          value={parsed !== null ? formatInBase(parsed, customBase) : ''}
          className="flex-1"
        />
      </div>
    </div>
  )
}

function BaseRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent', className)}
    >
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate font-mono">{value || '—'}</span>
        <CopyButton value={value} label="" className="shrink-0 px-1" />
      </div>
    </div>
  )
}
