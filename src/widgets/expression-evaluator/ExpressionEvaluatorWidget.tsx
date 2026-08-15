import { useId, useMemo, type KeyboardEvent } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/formatNumber'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { evaluateExpression } from './evaluateExpression'

const MAX_HISTORY = 20

export default function ExpressionEvaluatorWidget({ instanceId }: WidgetProps) {
  const [expression, setExpression] = useWidgetState(instanceId, 'expression', '')
  const [history, setHistory] = useWidgetState<string[]>(instanceId, 'history', [])
  useWidgetDirty(instanceId, expression.length > 0 || history.length > 0)
  const fieldId = useId()

  const { value, error } = useMemo(() => evaluateExpression(expression), [expression])
  const resultText = value !== null ? formatNumber(value) : ''

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || value === null) return
    setHistory((prev) => [`${expression.trim()} = ${resultText}`, ...prev].slice(0, MAX_HISTORY))
  }

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <Field label="Expression" htmlFor={fieldId}>
        <Input
          id={fieldId}
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. (2 + 3) * 4 ^ 2"
          spellCheck={false}
          className="font-mono"
        />
      </Field>

      <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2 font-mono text-base dark:bg-muted/40">
        {error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <span className={resultText ? undefined : 'text-sm text-muted-foreground'}>
            {resultText || 'Result will appear here'}
          </span>
        )}
        <CopyButton value={resultText} label="" />
      </div>

      <p className="text-muted-foreground">
        Supports + − × ÷ % ^ and parentheses. Press Enter to log a result below.
      </p>

      {history.length > 0 && (
        <ul className="min-h-0 flex-1 space-y-1 overflow-auto border-t border-border pt-2">
          {history.map((entry, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 font-mono hover:bg-accent"
            >
              <span className="truncate">{entry}</span>
              <CopyButton
                value={entry.slice(entry.lastIndexOf('=') + 1).trim()}
                label=""
                className="shrink-0 px-1"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
