import { useMemo, useState } from 'react'
import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useIsDarkTheme } from '@/theme/useThemeStore'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

type ViewMode = 'tree' | 'pretty' | 'minified'

const SAMPLE = '{\n  "hello": "world"\n}'

export default function JsonFormatterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useState(SAMPLE)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const isDark = useIsDarkTheme()
  useWidgetDirty(instanceId, input !== SAMPLE)

  const { data, error } = useMemo(() => {
    if (!input.trim())
      return { data: undefined as unknown, error: null as string | null }
    try {
      return { data: JSON.parse(input) as unknown, error: null }
    } catch (err) {
      return {
        data: undefined,
        error: err instanceof Error ? err.message : 'Invalid JSON',
      }
    }
  }, [input])

  const hasData = !error && data !== undefined
  const isTreeRenderable = hasData && typeof data === 'object' && data !== null

  const formattedOutput = useMemo(() => {
    if (!hasData) return ''
    return viewMode === 'minified'
      ? JSON.stringify(data)
      : JSON.stringify(data, null, 2)
  }, [data, hasData, viewMode])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: 'Tree', value: 'tree' },
            { label: 'Pretty', value: 'pretty' },
            { label: 'Minified', value: 'minified' },
          ]}
        />
        {hasData && <CopyButton value={formattedOutput} />}
      </div>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste JSON…"
        spellCheck={false}
        className="h-24 w-full resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : !hasData ? (
          <p className="text-xs text-slate-400">Output will appear here</p>
        ) : viewMode === 'tree' && isTreeRenderable ? (
          <JsonView
            data={data as object}
            style={isDark ? darkStyles : defaultStyles}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
            {formattedOutput}
          </pre>
        )}
      </div>
    </div>
  )
}
