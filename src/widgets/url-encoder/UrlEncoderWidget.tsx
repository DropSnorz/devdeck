import { useMemo } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

type Direction = 'encode' | 'decode'
type Mode = 'component' | 'full-uri'

export default function UrlEncoderWidget({ instanceId }: WidgetProps) {
  const [direction, setDirection] = useWidgetState<Direction>(instanceId, 'direction', 'encode')
  const [mode, setMode] = useWidgetState<Mode>(instanceId, 'mode', 'component')
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: null as string | null }
    try {
      const encodeFn = mode === 'component' ? encodeURIComponent : encodeURI
      const decodeFn = mode === 'component' ? decodeURIComponent : decodeURI
      return {
        output: direction === 'encode' ? encodeFn(input) : decodeFn(input),
        error: null,
      }
    } catch {
      return { output: '', error: 'Invalid input for decoding' }
    }
  }, [input, direction, mode])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={direction}
          onChange={setDirection}
          options={[
            { label: 'Encode', value: 'encode' },
            { label: 'Decode', value: 'decode' },
          ]}
        />
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Component', value: 'component' },
            { label: 'Full URI', value: 'full-uri' },
          ]}
        />
      </div>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={
          direction === 'encode' ? 'Text or URL to encode…' : 'URL to decode…'
        }
        spellCheck={false}
        className="h-16 w-full flex-1 resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <div className="relative flex-1">
        <textarea
          readOnly
          value={error ?? output}
          placeholder="Output"
          spellCheck={false}
          className={
            'h-16 w-full resize-none rounded-md border p-2 pr-14 font-mono text-xs ' +
            (error
              ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
              : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40')
          }
        />
        {!error && (
          <CopyButton
            value={output}
            className="absolute right-1 top-1 bg-inherit"
          />
        )}
      </div>
    </div>
  )
}
