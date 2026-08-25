import { useMemo } from 'react'
import { CodeEditor } from '@/components/CodeEditor'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { computeTextStatistics, estimateReadingTimeMinutes } from './computeTextStatistics'

const DEFAULT_CONTENT = ''

/** Free-form plain text notes, edited with the app's own CodeEditor (no
 * language grammar — just line numbers, search, and wrapping) plus a
 * collapsible statistics panel below, mirroring StatisticsCalculatorWidget's
 * label/value rows. */
export default function NotesWidget({ instanceId }: WidgetProps) {
  const [content, setContent] = useWidgetState(instanceId, 'content', DEFAULT_CONTENT)
  // Persisted per-instance like JsonFormatterWidget's viewMode — the panel
  // stays open or closed exactly how the user last left it, and doesn't
  // count toward the widget's dirty state below (same as that viewMode).
  const [statsOpen, setStatsOpen] = useWidgetState(instanceId, 'statsOpen', false)
  useWidgetDirty(instanceId, content !== DEFAULT_CONTENT)

  const stats = useMemo(() => computeTextStatistics(content), [content])
  const readingTime = estimateReadingTimeMinutes(stats.words)

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <CodeEditor
        value={content}
        onChange={setContent}
        language="plaintext"
        placeholder="Write something…"
        aria-label="Notes"
        className="min-h-0 flex-1"
      />

      <Collapsible
        open={statsOpen}
        onOpenChange={setStatsOpen}
        className="shrink-0 rounded-md border border-border bg-background px-2 py-1.5 dark:bg-muted/40"
      >
        <CollapsibleTrigger>
          <span className="font-medium">Statistics</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-2 font-mono text-[11px] sm:grid-cols-3">
            <StatItem label="Characters" value={stats.characters} />
            <StatItem label="No spaces" value={stats.charactersNoSpaces} />
            <StatItem label="Words" value={stats.words} />
            <StatItem label="Lines" value={stats.lines} />
            <StatItem label="Paragraphs" value={stats.paragraphs} />
            <StatItem label="Sentences" value={stats.sentences} />
            <StatItem label="Reading time" value={`${readingTime} min`} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
