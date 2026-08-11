import { useId } from 'react'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'

interface NumberFieldProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

/** Small labeled number input, clamped on change. Used by any UI offering a
 * keyboard/typed alternative to a drag gesture. */
export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  const id = useId()

  return (
    <Field label={label} htmlFor={id} className="text-xs">
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isFinite(next)) return
          const clamped = Math.min(
            max ?? next,
            Math.max(min ?? next, Math.round(next)),
          )
          onChange(clamped)
        }}
        className="h-auto font-mono"
      />
    </Field>
  )
}
