import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SegmentedControlOption<T extends string> {
  label: ReactNode
  value: T
  /** Accessible name, for icon-only labels that have no readable text of
   * their own (e.g. the theme switch). Not needed when `label` is plain
   * text — that already serves as the button's accessible name. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedControlOption<T>[]
  className?: string
}

/** Small pill-style toggle used across widgets for binary/enum choices
 * (encode/decode direction, hash algorithm, UTC/local, etc.), and for
 * icon-only choices like the theme switch. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-md bg-slate-100 p-0.5 text-xs dark:bg-slate-800',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          aria-label={option.ariaLabel}
          className={cn(
            'rounded px-2 py-1 font-medium transition-colors',
            option.value === value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
