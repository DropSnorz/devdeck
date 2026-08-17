import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'

interface NumberFieldProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

function clamp(next: number, min?: number, max?: number): number {
  return Math.min(max ?? next, Math.max(min ?? next, Math.round(next)))
}

/** Small labeled number input, clamped to `[min, max]` on blur. Used by any
 * UI offering a keyboard/typed alternative to a drag gesture.
 *
 * The displayed text is its own state, not a direct mirror of `value` —
 * deliberately, so the field can hold what a clamped number can't: blank
 * while backspacing, or a single leading digit that's below `min` on its
 * own (typing "40" starts at "4"). Clamping on every keystroke instead —
 * the previous approach — meant backspacing a value down to `min` (e.g. 5
 * to 4 with a min of 4) snapped the field to "4" the instant it went
 * blank, so the very next keystroke (also "4") landed as an append, not a
 * replacement, and produced "44". Text only resyncs from `value` while the
 * field isn't focused, so an out-of-range or unparseable in-progress edit
 * is never overwritten mid-keystroke, while an external change (e.g.
 * SubnetCalculatorWidget deriving the prefix from a pasted CIDR block)
 * still shows up immediately. */
export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  return (
    <Field label={label} htmlFor={id} className="text-xs">
      <Input
        id={id}
        type="number"
        value={text}
        min={min}
        max={max}
        onFocus={() => {
          focused.current = true
        }}
        onChange={(event) => {
          const raw = event.target.value
          setText(raw)
          const next = Number(raw)
          // Blank and "still typing a negative sign" are left uncommitted
          // rather than coerced to 0 — the field just shows them as-is
          // until there's a real number to propagate.
          if (raw.trim() === '' || !Number.isFinite(next)) return
          onChange(Math.round(next))
        }}
        onBlur={() => {
          focused.current = false
          const next = Number(text)
          const resolved = text.trim() === '' || !Number.isFinite(next) ? value : clamp(next, min, max)
          setText(String(resolved))
          if (resolved !== value) onChange(resolved)
        }}
        className="h-auto font-mono"
      />
    </Field>
  )
}
