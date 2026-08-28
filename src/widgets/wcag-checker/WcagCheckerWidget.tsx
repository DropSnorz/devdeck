import { useId } from 'react'
import { colord, type Colord } from 'colord'
import { ArrowDownUp, Check, X } from 'lucide-react'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageColorPicker } from '@/components/PageColorPicker'
import { ScreenColorPicker } from '@/components/ScreenColorPicker'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { contrastRatio, evaluateWcag, formatRatio } from './wcagContrast'

const INITIAL_FG = colord('#000000')
const INITIAL_BG = colord('#ffffff')

interface WcagCheckerWidgetProps extends WidgetProps {
  /** Overrides the widget's usual black-on-white starting point — hex
   * strings, not Colord, to keep this prop trivially serializable. Only
   * meant for the About page's live preview (see src/about/AboutPage.tsx),
   * which remounts the widget with a new pair on an interval; real
   * dashboard/registry usage never passes these; the fallback is unchanged. */
  initialFg?: string
  initialBg?: string
}

export default function WcagCheckerWidget({ instanceId, initialFg, initialBg }: WcagCheckerWidgetProps) {
  const initialFgColor = initialFg ? colord(initialFg) : INITIAL_FG
  const initialBgColor = initialBg ? colord(initialBg) : INITIAL_BG
  const [fg, setFg] = useWidgetState<Colord>(instanceId, 'fg', initialFgColor)
  const [bg, setBg] = useWidgetState<Colord>(instanceId, 'bg', initialBgColor)
  const [fgInput, setFgInput] = useWidgetState(instanceId, 'fgInput', initialFgColor.toHex())
  const [bgInput, setBgInput] = useWidgetState(instanceId, 'bgInput', initialBgColor.toHex())

  useWidgetDirty(instanceId, fgInput !== initialFgColor.toHex() || bgInput !== initialBgColor.toHex())

  const handleFgChange = (value: string) => {
    setFgInput(value)
    const parsed = colord(value)
    if (parsed.isValid()) setFg(parsed)
  }
  const handleBgChange = (value: string) => {
    setBgInput(value)
    const parsed = colord(value)
    if (parsed.isValid()) setBg(parsed)
  }
  const handleFgPick = (hex: string) => {
    const parsed = colord(hex)
    if (!parsed.isValid()) return
    setFg(parsed)
    setFgInput(parsed.toHex())
  }
  const handleBgPick = (hex: string) => {
    const parsed = colord(hex)
    if (!parsed.isValid()) return
    setBg(parsed)
    setBgInput(parsed.toHex())
  }

  const handleSwap = () => {
    setFg(bg)
    setBg(fg)
    setFgInput(bgInput)
    setBgInput(fgInput)
  }

  const ratio = contrastRatio(fg, bg)
  const checks = evaluateWcag(ratio)

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex flex-col gap-1.5">
        <ColorRow label="Text" hex={fgInput} onHexChange={handleFgChange} onPick={handleFgPick} swatch={fg.toHex()} />
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleSwap}
            aria-label="Swap text and background colors"
            title="Swap text and background colors"
          >
            <ArrowDownUp />
          </Button>
        </div>
        <ColorRow
          label="Background"
          hex={bgInput}
          onHexChange={handleBgChange}
          onPick={handleBgPick}
          swatch={bg.toHex()}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
        <div>
          <div className="text-lg font-semibold tabular-nums leading-tight">{formatRatio(ratio)}</div>
          <div className="text-muted-foreground">Contrast ratio</div>
        </div>
        <CopyButton value={formatRatio(ratio)} label="" ariaLabel="Copy contrast ratio" />
      </div>

      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div
            key={check.key}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-1',
              check.pass
                ? 'bg-success/15 text-success dark:bg-success/20'
                : 'bg-destructive/10 text-destructive dark:bg-destructive/20',
            )}
          >
            {check.pass ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">
              <span className="sr-only">{check.pass ? 'Pass: ' : 'Fail: '}</span>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-border p-2"
        style={{ backgroundColor: bg.toHex(), color: fg.toHex() }}
        aria-hidden="true"
      >
        <span className="text-base font-bold">Large text sample</span>
        <span>Normal text sample</span>
      </div>
    </div>
  )
}

function ColorRow({
  label,
  hex,
  onHexChange,
  onPick,
  swatch,
}: {
  label: string
  hex: string
  onHexChange: (value: string) => void
  onPick: (hex: string) => void
  swatch: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-1.5">
        <Input
          type="color"
          value={swatch}
          onChange={(event) => onPick(event.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer p-0"
          aria-label={`${label} color swatch`}
        />
        <Input
          id={id}
          value={hex}
          onChange={(event) => onHexChange(event.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 font-mono"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <PageColorPicker onPick={onPick} />
          <ScreenColorPicker onPick={onPick} />
        </div>
      </div>
    </Field>
  )
}
