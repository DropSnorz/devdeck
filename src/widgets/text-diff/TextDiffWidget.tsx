import { useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { CodeEditor } from '@/components/CodeEditor'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import {
  computeInlineDiff,
  computeLineDiff,
  inlineDiffToText,
  lineDiffToText,
  type DiffGranularity,
  type DiffPartType,
} from './computeTextDiff'

const SAMPLE_ORIGINAL = 'The quick brown fox\njumps over the lazy dog.'
const SAMPLE_CHANGED = 'The quick brown fox\nleaps over the lazy dog!'

const LINE_MARKER: Record<DiffPartType, string> = { added: '+', removed: '-', unchanged: '' }

const LINE_CLASS: Record<DiffPartType, string> = {
  added: 'bg-success/15 text-success',
  removed: 'bg-destructive/15 text-destructive',
  unchanged: '',
}

const SEGMENT_CLASS: Record<DiffPartType, string> = {
  added: 'rounded bg-success/15 text-success underline decoration-success/50',
  removed: 'rounded bg-destructive/15 text-destructive line-through decoration-destructive/50',
  unchanged: '',
}

/** Compares two texts using the app's own CodeEditor for both inputs, with
 * a line/word/character diff rendered below — mirrors JsonFormatterWidget's
 * shape (editable CodeEditor(s) on top, a derived read-only view below). */
export default function TextDiffWidget({ instanceId }: WidgetProps) {
  const [original, setOriginal] = useWidgetState(instanceId, 'original', SAMPLE_ORIGINAL)
  const [changed, setChanged] = useWidgetState(instanceId, 'changed', SAMPLE_CHANGED)
  const [granularity, setGranularity] = useWidgetState<DiffGranularity>(
    instanceId,
    'granularity',
    'lines',
  )
  useWidgetDirty(instanceId, original !== SAMPLE_ORIGINAL || changed !== SAMPLE_CHANGED)

  const lineResult = useMemo(
    () => (granularity === 'lines' ? computeLineDiff(original, changed) : null),
    [granularity, original, changed],
  )
  const inlineResult = useMemo(
    () => (granularity === 'lines' ? null : computeInlineDiff(original, changed, granularity)),
    [granularity, original, changed],
  )
  // Exactly one of the two above is non-null for any given `granularity`.
  const stats = (lineResult ?? inlineResult)!.stats
  const identical = (lineResult ?? inlineResult)!.identical
  const copyText = lineResult
    ? lineDiffToText(lineResult)
    : inlineResult
      ? inlineDiffToText(inlineResult)
      : ''

  const swap = () => {
    setOriginal(changed)
    setChanged(original)
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={[
            { label: 'Lines', value: 'lines' },
            { label: 'Words', value: 'words' },
            { label: 'Chars', value: 'chars' },
          ]}
        />
        <div className="flex items-center gap-2">
          {!identical && (
            <span className="font-mono">
              <span className="text-success">+{stats.additions}</span>{' '}
              <span className="text-destructive">-{stats.deletions}</span>
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={swap}
            aria-label="Swap original and changed text"
            title="Swap original and changed text"
          >
            <ArrowLeftRight className="size-3.5" />
            Swap
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-[2] grid-cols-2 gap-2">
        <CodeEditor
          value={original}
          onChange={setOriginal}
          placeholder="Original text…"
          aria-label="Original text"
          className="min-h-0"
        />
        <CodeEditor
          value={changed}
          onChange={setChanged}
          placeholder="Changed text…"
          aria-label="Changed text"
          className="min-h-0"
        />
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background font-mono dark:bg-muted/40">
        {identical ? (
          <p className="p-2 text-muted-foreground">No differences</p>
        ) : lineResult ? (
          <div role="group" aria-label="Diff result">
            {lineResult.lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2 px-2 whitespace-pre-wrap break-all',
                  LINE_CLASS[line.type],
                )}
              >
                <span className="w-3 shrink-0 select-none text-center text-muted-foreground">
                  {LINE_MARKER[line.type]}
                </span>
                <span>{line.text || ' '}</span>
              </div>
            ))}
          </div>
        ) : inlineResult ? (
          <p aria-label="Diff result" className="p-2 whitespace-pre-wrap break-words">
            {inlineResult.segments.map((segment, index) => (
              <span key={index} className={SEGMENT_CLASS[segment.type]}>
                {segment.text}
              </span>
            ))}
          </p>
        ) : null}
        {!identical && <CopyButton value={copyText} className="absolute right-1 top-1 bg-inherit" />}
      </div>
    </div>
  )
}
