import { useEffect, useState } from 'react'
import SparkMD5 from 'spark-md5'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

type Algorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

const ALGORITHMS: Algorithm[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
]

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function computeHash(
  algorithm: Algorithm,
  text: string,
): Promise<string> {
  if (algorithm === 'MD5') return SparkMD5.hash(text)
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest(algorithm, bytes)
  return bufferToHex(digest)
}

export default function HashGeneratorWidget({ instanceId }: WidgetProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256')
  const [input, setInput] = useState('')
  const [hash, setHash] = useState('')
  useWidgetDirty(instanceId, input.length > 0)

  useEffect(() => {
    if (!input) return
    let cancelled = false
    computeHash(algorithm, input).then((result) => {
      if (!cancelled) setHash(result)
    })
    return () => {
      cancelled = true
    }
  }, [algorithm, input])

  // Derived rather than reset via effect: clears instantly when input is
  // cleared instead of waiting a tick for the effect above to run.
  const displayedHash = input ? hash : ''

  return (
    <div className="flex h-full flex-col gap-2">
      <SegmentedControl
        value={algorithm}
        onChange={setAlgorithm}
        options={ALGORITHMS.map((value) => ({ label: value, value }))}
        className="flex-wrap"
      />
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Text to hash…"
        spellCheck={false}
        className="h-16 w-full flex-1 resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <div className="relative">
        <input
          readOnly
          value={displayedHash}
          placeholder="Hash output"
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 pr-14 font-mono text-xs dark:border-slate-800 dark:bg-slate-800/40"
        />
        <CopyButton value={displayedHash} className="absolute right-1 top-1" />
      </div>
    </div>
  )
}
