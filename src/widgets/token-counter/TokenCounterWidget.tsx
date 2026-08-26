import { useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { countTextStats, estimateChatGptTokens, estimateClaudeTokens } from './tokenCounter'

export default function TokenCounterWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const stats = useMemo(() => countTextStats(input), [input])
  const chatGptTokens = useMemo(() => estimateChatGptTokens(input), [input])
  const claudeTokens = useMemo(() => estimateClaudeTokens(input), [input])

  return (
    <div className="flex h-full flex-col gap-2">
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste a prompt to estimate its tokens…"
        spellCheck={false}
        className="min-h-0 flex-1 resize-none p-2 font-mono text-xs"
      />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <TokenCard label="ChatGPT" tokens={chatGptTokens} />
        <TokenCard label="Claude" tokens={claudeTokens} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {stats.characters.toLocaleString()} character{stats.characters === 1 ? '' : 's'} ·{' '}
        {stats.words.toLocaleString()} word{stats.words === 1 ? '' : 's'}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Both figures are rough estimates from word/character counts, not the real tokenizers. OpenAI's real tokenizer
        exists but its data is too heavy to ship in a browser widget; Anthropic doesn't publish one at all. For an exact
        Claude count, use the{' '}
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

function TokenCard({ label, tokens }: { label: string; tokens: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 dark:bg-muted/40">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold text-foreground">~{tokens.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground">token{tokens === 1 ? '' : 's'} · estimate</p>
    </div>
  )
}
