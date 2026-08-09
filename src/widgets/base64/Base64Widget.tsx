import { useMemo, useState } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

type Direction = 'encode' | 'decode'

/** Unicode-safe base64 encode: text -> UTF-8 bytes -> base64. */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

/** Unicode-safe base64 decode: base64 -> UTF-8 bytes -> text. */
function decodeBase64(input: string): string {
  const binary = atob(input)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder(undefined, { fatal: false }).decode(bytes)
}

export default function Base64Widget({ instanceId }: WidgetProps) {
  const [direction, setDirection] = useState<Direction>('encode')
  const [input, setInput] = useState('')
  useWidgetDirty(instanceId, input.length > 0)

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: null as string | null }
    try {
      const result =
        direction === 'encode' ? encodeBase64(input) : decodeBase64(input)
      return { output: result, error: null }
    } catch {
      return {
        output: '',
        error:
          direction === 'encode'
            ? 'Could not encode input'
            : 'Invalid base64 input',
      }
    }
  }, [input, direction])

  return (
    <div className="flex h-full flex-col gap-2">
      <SegmentedControl
        value={direction}
        onChange={setDirection}
        options={[
          { label: 'Encode', value: 'encode' },
          { label: 'Decode', value: 'decode' },
        ]}
      />
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={
          direction === 'encode' ? 'Text to encode…' : 'Base64 to decode…'
        }
        spellCheck={false}
        className="h-20 w-full flex-1 resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <div className="relative flex-1">
        <textarea
          readOnly
          value={error ?? output}
          placeholder="Output"
          spellCheck={false}
          className={
            'h-20 w-full resize-none rounded-md border p-2 pr-14 font-mono text-xs ' +
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
