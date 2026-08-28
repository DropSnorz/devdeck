import { useId } from 'react'
import { colord, type Colord } from 'colord'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { Input } from '@/components/ui/input'
import { PageColorPicker } from '@/components/PageColorPicker'
import { ScreenColorPicker } from '@/components/ScreenColorPicker'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

const INITIAL = colord('#65a1fe')

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
  const [color, setColor] = useWidgetState<Colord>(instanceId, 'color', INITIAL)
  const [hexInput, setHexInput] = useWidgetState(instanceId, 'hexInput', INITIAL.toHex())
  const [rgbInput, setRgbInput] = useWidgetState(instanceId, 'rgbInput', formatRgb(INITIAL))
  const [hslInput, setHslInput] = useWidgetState(instanceId, 'hslInput', formatHsl(INITIAL))
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
      <div className="flex items-center gap-1.5">
        <Input
          type="color"
          value={color.toHex()}
          onChange={(event) => handleNativePicker(event.target.value)}
          className="h-9 min-w-0 flex-1 cursor-pointer p-0"
          aria-label="Pick a color"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <PageColorPicker onPick={handleNativePicker} />
          <ScreenColorPicker onPick={handleNativePicker} />
        </div>
      </div>

      <ColorField label="HEX" value={hexInput} onChange={handleHexChange} />
      <ColorField label="RGB" value={rgbInput} onChange={handleRgbChange} />
      <ColorField label="HSL" value={hslInput} onChange={handleHslChange} />

      <div
        className="h-3 shrink-0 rounded border border-input"
        style={{ backgroundColor: color.toRgbString() }}
        aria-hidden="true"
      />
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
  const id = useId()
  return (
    <Field label={label} htmlFor={id} layout="row">
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-w-0 flex-1 font-mono"
      />
      <CopyButton value={value} label="" />
    </Field>
  )
}
