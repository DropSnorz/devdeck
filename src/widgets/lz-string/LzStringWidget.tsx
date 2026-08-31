import { useMemo } from 'react'
import LZString from 'lz-string'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

type Direction = 'compress' | 'decompress'

export default function LzStringWidget({ instanceId }: WidgetProps) {
  const [direction, setDirection] = useWidgetState<Direction>(instanceId, 'direction', 'compress')
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: null as string | null }
    if (direction === 'compress') {
      return { output: LZString.compressToEncodedURIComponent(input), error: null }
    }
    // decompressFromEncodedURIComponent never throws, and readily returns
    // *something* for input that was never actually compressed (e.g.
    // "helloworld" decodes to a couple of garbage characters) — there's no
    // UTF-8-style validity gate to lean on the way byte-oriented decoders
    // have one. Recompressing the result and checking it reproduces the
    // original input is a much stronger gate: compression is deterministic,
    // so only an actual compressed payload round-trips exactly (same check
    // content-type-detector's decodeLzString uses).
    const decoded = LZString.decompressFromEncodedURIComponent(input)
    const isValid = decoded && LZString.compressToEncodedURIComponent(decoded) === input
    return isValid ? { output: decoded, error: null } : { output: '', error: 'Invalid LZ-String input' }
  }, [input, direction])

  return (
    <div className="flex h-full flex-col gap-2">
      <SegmentedControl
        value={direction}
        onChange={setDirection}
        options={[
          { label: 'Compress', value: 'compress' },
          { label: 'Decompress', value: 'decompress' },
        ]}
      />
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={direction === 'compress' ? 'Text to compress…' : 'LZ-String to decompress…'}
        spellCheck={false}
        className="h-20 w-full flex-1 resize-none p-2 font-mono text-xs"
      />
      <div className="relative flex-1">
        <Textarea
          readOnly
          value={error ?? output}
          placeholder="Output"
          spellCheck={false}
          className={cn(
            'h-20 w-full resize-none p-2 pr-14 font-mono text-xs',
            error
              ? 'border-destructive bg-destructive/10 text-destructive'
              : 'border-border bg-background dark:bg-muted/40',
          )}
        />
        {!error && <CopyButton value={output} className="absolute right-1 top-1 bg-inherit" />}
      </div>
    </div>
  )
}
