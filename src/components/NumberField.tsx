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
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
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
        className="rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
    </label>
  )
}
