import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

const FLAG_OPTIONS = ['g', 'i', 'm', 's'] as const

interface Segment {
  text: string
  isMatch: boolean
}

export default function RegexTesterWidget({ instanceId }: WidgetProps) {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<string[]>(['g'])
  const [text, setText] = useState('')
  useWidgetDirty(instanceId, pattern.length > 0 || text.length > 0)

  const toggleFlag = (flag: string) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    )
  }

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null, error: null as string | null }
    try {
      return { regex: new RegExp(pattern, flags.join('')), error: null }
    } catch (err) {
      return {
        regex: null,
        error: err instanceof Error ? err.message : 'Invalid pattern',
      }
    }
  }, [pattern, flags])

  const matches = useMemo(() => {
    if (!regex || !text) return []
    if (!regex.global) {
      const match = regex.exec(text)
      return match ? [match] : []
    }
    return Array.from(text.matchAll(regex))
  }, [regex, text])

  const segments = useMemo<Segment[]>(() => {
    if (matches.length === 0) return [{ text, isMatch: false }]
    const parts: Segment[] = []
    let cursor = 0
    for (const match of matches) {
      const index = match.index ?? 0
      if (index > cursor)
        parts.push({ text: text.slice(cursor, index), isMatch: false })
      parts.push({ text: match[0], isMatch: true })
      cursor = index + match[0].length
      if (match[0].length === 0) break // avoid infinite growth on zero-width matches
    }
    if (cursor < text.length)
      parts.push({ text: text.slice(cursor), isMatch: false })
    return parts
  }, [matches, text])

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-slate-400">/</span>
        <input
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder="pattern"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
        />
        <span className="text-slate-400">/</span>
        {FLAG_OPTIONS.map((flag) => (
          <button
            key={flag}
            type="button"
            onClick={() => toggleFlag(flag)}
            aria-pressed={flags.includes(flag)}
            className={cn(
              'rounded px-1.5 py-1 font-mono',
              flags.includes(flag)
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            )}
          >
            {flag}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Test string…"
        spellCheck={false}
        className="h-16 w-full resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono dark:border-slate-800 dark:bg-slate-800/40">
        {!error &&
          segments.map((segment, index) =>
            segment.isMatch ? (
              <mark
                key={index}
                className="rounded bg-amber-200 px-0.5 dark:bg-amber-500/40"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
      </div>
      {matches.length > 0 && (
        <p className="text-slate-500 dark:text-slate-400">
          {matches.length} match{matches.length === 1 ? '' : 'es'}
        </p>
      )}
    </div>
  )
}
