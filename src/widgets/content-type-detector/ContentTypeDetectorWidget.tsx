import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { CopyButton } from '@/components/CopyButton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { buildChains, type DetectionChain } from './detect'

function chainConfidence(chain: DetectionChain): number {
  return chain.reduce((score, node) => score * node.confidence, 1)
}

export default function ContentTypeDetectorWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const chains = useMemo(() => buildChains(input), [input])

  return (
    <div className="flex h-full flex-col gap-2">
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste text to identify…"
        spellCheck={false}
        className="h-16 w-full resize-none p-2 font-mono text-xs"
      />
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background p-2 dark:bg-muted/40">
        {chains.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Paste something above to see what it might be — Base64, hex, a JWT, JSON, a UUID… including things wrapped
            in each other.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {chains.map((chain, index) => (
              // Chains are stable for a given input (buildChains is pure and
              // dedupes), so an index key here won't reorder/lose state.
              <ChainRow key={index} chain={chain} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ChainRow({ chain }: { chain: DetectionChain }) {
  const last = chain[chain.length - 1]
  const score = chainConfidence(chain)

  return (
    <li className="rounded-md border border-border/60 p-1.5">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
        {chain.map((node, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
            <span
              title={`${Math.round(node.confidence * 100)}% confidence`}
              className={cn(
                'rounded-full px-2 py-0.5 font-medium',
                node.type === 'text'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary dark:bg-primary/20',
              )}
            >
              {node.label}
            </span>
          </span>
        ))}
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{Math.round(score * 100)}%</span>
      </div>
      <div className="relative mt-1">
        <pre className="max-h-16 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/40 p-1.5 pr-12 font-mono text-[11px]">
          {last.value}
        </pre>
        <CopyButton value={last.value} className="absolute right-1 top-1 bg-inherit" />
      </div>
    </li>
  )
}
