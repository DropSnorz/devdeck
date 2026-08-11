import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { ErrorMessage } from '@/components/ErrorMessage'
import { cn } from '@/lib/utils'

interface FieldProps {
  /** Renders a real `<Label htmlFor>` wired to the control's `id` (the
   * caller must give its Input/Textarea the same `id`) — only pass this for
   * widgets that need an accessible label beyond a placeholder (see the
   * label-based test suites: ColorConverterWidget, CronWidget,
   * TimestampConverterWidget). Widgets that identify their field via
   * `placeholder` instead should skip Field and use Input/Textarea
   * directly. */
  label?: string
  htmlFor?: string
  error?: string | null
  /** `column` (label above control) is the common case; `row` (label beside
   * control) matches ColorConverterWidget's HEX/RGB/HSL fields. */
  layout?: 'column' | 'row'
  children: ReactNode
  className?: string
}

export function Field({
  label,
  htmlFor,
  error,
  layout = 'column',
  children,
  className,
}: FieldProps) {
  return (
    <div
      className={cn(
        layout === 'row' ? 'flex items-center gap-1' : 'flex flex-col gap-1',
        className,
      )}
    >
      {label && (
        <Label
          htmlFor={htmlFor}
          className={cn(
            'font-normal text-muted-foreground',
            layout === 'row' && 'w-8 shrink-0',
          )}
        >
          {label}
        </Label>
      )}
      {children}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  )
}
