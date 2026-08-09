import { useMemo } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

function capitalize(word: string): string {
  return word[0].toUpperCase() + word.slice(1)
}

const CONVERTERS: { label: string; convert: (words: string[]) => string }[] = [
  {
    label: 'camelCase',
    convert: (w) =>
      w.map((word, i) => (i === 0 ? word : capitalize(word))).join(''),
  },
  { label: 'PascalCase', convert: (w) => w.map(capitalize).join('') },
  { label: 'snake_case', convert: (w) => w.join('_') },
  { label: 'kebab-case', convert: (w) => w.join('-') },
  { label: 'CONSTANT_CASE', convert: (w) => w.join('_').toUpperCase() },
  { label: 'Title Case', convert: (w) => w.map(capitalize).join(' ') },
]

export default function TextCaseConverterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  const words = useMemo(() => splitWords(input), [input])
  useWidgetDirty(instanceId, input.length > 0)

  return (
    <div className="flex h-full flex-col gap-2">
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Enter text…"
        spellCheck={false}
        className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
        {CONVERTERS.map(({ label, convert }) => {
          const output = words.length ? convert(words) : ''
          return (
            <li
              key={label}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="truncate font-mono text-xs">{output || '—'}</p>
              </div>
              <CopyButton value={output} label="" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
