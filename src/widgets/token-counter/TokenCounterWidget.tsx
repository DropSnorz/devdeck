import { useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { countChatGptTokens, countTextStats, estimateClaudeTokens } from './tokenCounter'

export default function TokenCounterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const stats = useMemo(() => countTextStats(input), [input])
  const chatGptTokens = useMemo(() => countChatGptTokens(input), [input])
  const claudeTokens = useMemo(() => estimateClaudeTokens(input), [input])

  return (
    <div className="flex h-full flex-col gap-2">
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste a prompt to count its tokens…"
        spellCheck={false}
        className="min-h-0 flex-1 resize-none p-2 font-mono text-xs"
      />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <TokenCard label="ChatGPT" sublabel="GPT-4o / GPT-5 tokenizer, exact" tokens={chatGptTokens} />
        <TokenCard label="Claude" sublabel="rough estimate, not exact" tokens={claudeTokens} approximate />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {stats.characters.toLocaleString()} character{stats.characters === 1 ? '' : 's'} ·{' '}
        {stats.words.toLocaleString()} word{stats.words === 1 ? '' : 's'}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Anthropic doesn't publish Claude's tokenizer. The Claude figure is a rough estimate from word/character counts,
        not Claude's real tokenizer, for an exact count use the{' '}
        <a
          href="https://platform.claude.com/docs/en/build-with-claude/token-counting"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          count_tokens API
        </a>
        .
      </p>
    </div>
  )
}

function TokenCard({
  label,
  sublabel,
  tokens,
  approximate,
}: {
  label: string
  sublabel: string
  tokens: number
  approximate?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 dark:bg-muted/40">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold text-foreground">
        {approximate ? '~' : ''}
        {tokens.toLocaleString()}
      </p>
      <p className="text-[11px] text-muted-foreground">
        token{tokens === 1 ? '' : 's'} · {sublabel}
      </p>
    </div>
  )
}
