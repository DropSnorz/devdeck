import { useState } from 'react'
import { colord, type Colord } from 'colord'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

const INITIAL = colord('#3b82f6')

function formatRgb(c: Colord): string {
  const { r, g, b, a } = c.toRgb()
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
}

function formatHsl(c: Colord): string {
  const { h, s, l, a } = c.toHsl()
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`
}

type Field = 'hex' | 'rgb' | 'hsl' | 'none'

export default function ColorConverterWidget({ instanceId }: WidgetProps) {
  const [color, setColor] = useState<Colord>(INITIAL)
  const [hexInput, setHexInput] = useState(INITIAL.toHex())
  const [rgbInput, setRgbInput] = useState(formatRgb(INITIAL))
  const [hslInput, setHslInput] = useState(formatHsl(INITIAL))
  useWidgetDirty(instanceId, hexInput !== INITIAL.toHex())

  const applyColor = (next: Colord, editedField: Field) => {
    setColor(next)
    if (editedField !== 'hex') setHexInput(next.toHex())
    if (editedField !== 'rgb') setRgbInput(formatRgb(next))
    if (editedField !== 'hsl') setHslInput(formatHsl(next))
  }

  const handleHexChange = (value: string) => {
    setHexInput(value)
    const parsed = colord(value)
    if (parsed.isValid()) applyColor(parsed, 'hex')
  }
  const handleRgbChange = (value: string) => {
    setRgbInput(value)
    const parsed = colord(value)
    if (parsed.isValid()) applyColor(parsed, 'rgb')
  }
  const handleHslChange = (value: string) => {
    setHslInput(value)
    const parsed = colord(value)
    if (parsed.isValid()) applyColor(parsed, 'hsl')
  }
  const handleNativePicker = (value: string) => {
    const parsed = colord(value)
    if (parsed.isValid()) applyColor(parsed, 'none')
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color.toHex()}
          onChange={(event) => handleNativePicker(event.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-700"
          aria-label="Pick a color"
        />
        <div
          className="h-9 flex-1 rounded border border-slate-300 dark:border-slate-700"
          style={{ backgroundColor: color.toRgbString() }}
        />
      </div>

      <ColorField label="HEX" value={hexInput} onChange={handleHexChange} />
      <ColorField label="RGB" value={rgbInput} onChange={handleRgbChange} />
      <ColorField label="HSL" value={hslInput} onChange={handleHslChange} />
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="w-8 shrink-0 text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <CopyButton value={value} label="" />
    </label>
  )
}
