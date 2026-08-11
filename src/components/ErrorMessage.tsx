import type { ReactNode } from 'react'

/** Standardized inline error text, replacing the `<p className="text-red-600
 * dark:text-red-400">` idiom repeated across widgets. */
export function ErrorMessage({ children }: { children: ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>
}
