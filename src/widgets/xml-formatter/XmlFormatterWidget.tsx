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
import { minifyXml, parseXml, prettyPrintXml, xmlToTree } from './xmlFormat'

type ViewMode = 'plain' | 'tree' | 'pretty' | 'minified'

const SAMPLE = '<root>\n  <hello>world</hello>\n</root>'

export default function XmlFormatterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', SAMPLE)
  const [viewMode, setViewMode] = useWidgetState<ViewMode>(instanceId, 'viewMode', 'plain')
  const isDark = useIsDarkTheme()
  useWidgetDirty(instanceId, input !== SAMPLE)

  const { doc, error } = useMemo(() => {
    if (!input.trim()) return { doc: null as Document | null, error: null as string | null }
    return parseXml(input)
  }, [input])

  const hasData = !error && doc !== null

  const formattedOutput = useMemo(() => {
    if (!hasData || !doc) return ''
    return viewMode === 'minified' ? minifyXml(input, doc) : prettyPrintXml(input, doc)
  }, [doc, hasData, input, viewMode])

  const treeData = useMemo(() => {
    if (!hasData || !doc) return null
    return xmlToTree(doc)
  }, [doc, hasData])

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
        language="xml"
        placeholder="Paste XML…"
        aria-label="XML input"
        className="min-h-0 flex-1"
      />
      {viewMode !== 'plain' && (
        <div className="relative min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background p-2 dark:bg-muted/40">
          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : !hasData ? (
            <p className="text-xs text-muted-foreground">Output will appear here</p>
          ) : viewMode === 'tree' && treeData ? (
            <JsonView data={treeData} style={isDark ? darkStyles : defaultStyles} />
          ) : (
            <Textarea
              readOnly
              value={formattedOutput}
              spellCheck={false}
              aria-label="XML output"
              className="h-full w-full resize-none border-0 bg-transparent p-0 pr-14 font-mono text-xs"
            />
          )}
          {hasData && <CopyButton value={formattedOutput} className="absolute right-1 top-1 bg-inherit" />}
        </div>
      )}
    </div>
  )
}
