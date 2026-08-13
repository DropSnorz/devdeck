import { useMemo } from 'react'
import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { ErrorMessage } from '@/components/ErrorMessage'
import { CodeEditor } from '@/components/CodeEditor'
import { Textarea } from '@/components/ui/textarea'
import { useIsDarkTheme } from '@/theme/useThemeStore'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

type ViewMode = 'plain' | 'tree' | 'pretty' | 'minified'

const SAMPLE = '{\n  "hello": "world"\n}'

export default function JsonFormatterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', SAMPLE)
  const [viewMode, setViewMode] = useWidgetState<ViewMode>(instanceId, 'viewMode', 'tree')
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
      <SegmentedControl
        value={viewMode}
        onChange={setViewMode}
        options={[
          { label: 'Plain', value: 'plain' },
          { label: 'Tree', value: 'tree' },
          { label: 'Pretty', value: 'pretty' },
          { label: 'Minified', value: 'minified' },
        ]}
      />
      <CodeEditor
        value={input}
        onChange={setInput}
        language="json"
        placeholder="Paste JSON…"
        aria-label="JSON input"
        className="min-h-0 flex-1"
      />
      {viewMode !== 'plain' && (
        <div className="relative min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background p-2 dark:bg-muted/40">
          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : !hasData ? (
            <p className="text-xs text-muted-foreground">
              Output will appear here
            </p>
          ) : viewMode === 'tree' && isTreeRenderable ? (
            <JsonView
              data={data as object}
              style={isDark ? darkStyles : defaultStyles}
            />
          ) : (
            <Textarea
              readOnly
              value={formattedOutput}
              spellCheck={false}
              aria-label="JSON output"
              className="h-full w-full resize-none border-0 bg-transparent p-0 pr-14 font-mono text-xs"
            />
          )}
          {hasData && (
            <CopyButton
              value={formattedOutput}
              className="absolute right-1 top-1 bg-inherit"
            />
          )}
        </div>
      )}
    </div>
  )
}
