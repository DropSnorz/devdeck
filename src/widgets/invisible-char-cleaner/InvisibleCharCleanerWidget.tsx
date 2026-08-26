import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { CopyButton } from '@/components/CopyButton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { buildPreviewSegments, cleanText, extractHiddenTagText, groupMatches, scanText } from './invisibleChars'

export default function InvisibleCharCleanerWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const matches = useMemo(() => scanText(input), [input])
  const groups = useMemo(() => groupMatches(matches), [matches])
  const segments = useMemo(() => buildPreviewSegments(input, matches), [input, matches])
  const cleaned = useMemo(() => cleanText(input), [input])
  const hiddenRuns = useMemo(() => extractHiddenTagText(input), [input])

  return (
    <div className="flex h-full flex-col gap-2">
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste text to scan for invisible characters…"
        spellCheck={false}
        className="h-16 w-full resize-none p-2 font-mono text-xs"
      />
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background p-2 text-xs dark:bg-muted/40">
        {!input ? (
          <p className="text-muted-foreground">
            Paste text above to find zero-width spaces, bidi overrides, hidden Unicode tag characters, and other
            characters that render invisibly but a human reader can't see, the kind AI tools, watermarking, and
            copy-paste chains sometimes leave behind.
          </p>
        ) : matches.length === 0 ? (
          <p className="text-success">No invisible characters found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">
              {matches.length} invisible character{matches.length === 1 ? '' : 's'} found across {groups.length} type
              {groups.length === 1 ? '' : 's'}
            </p>

            {hiddenRuns.length > 0 && (
              <div className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive">
                <p className="flex items-center gap-1 font-medium">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  Hidden text found inside invisible Unicode tag characters
                </p>
                <p className="text-muted-foreground">
                  This can smuggle instructions to an AI system that a human reader never sees ("ASCII smuggling").
                </p>
                <ul className="flex flex-col gap-1">
                  {hiddenRuns.map((run, index) => (
                    <li key={index} className="overflow-x-auto rounded bg-background/70 px-1.5 py-1 font-mono">
                      &quot;{run}&quot;
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="whitespace-pre-wrap break-all rounded-md border border-border bg-muted/30 p-2 font-mono">
              {segments.map((segment, index) =>
                segment.kind === 'invisible' ? (
                  <mark
                    key={index}
                    title={segment.label}
                    className="mx-px rounded bg-destructive/20 px-0.5 align-baseline text-[10px] font-semibold text-destructive"
                  >
                    {segment.shortLabel}
                    {segment.count > 1 ? `×${segment.count}` : ''}
                  </mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </pre>

            <ul className="flex flex-wrap gap-1">
              {groups.map((group) => (
                <li
                  key={group.name}
                  title={group.name}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {group.name} × {group.count}
                </li>
              ))}
            </ul>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cleaned text</p>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="xs" onClick={() => setInput(cleaned)}>
                    Use as input
                  </Button>
                  <CopyButton value={cleaned} />
                </div>
              </div>
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 font-mono">
                {cleaned}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
