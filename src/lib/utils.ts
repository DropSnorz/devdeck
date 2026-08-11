import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names and resolves conflicting Tailwind utilities (e.g.
 * `cn('px-2', condition && 'px-4')` keeps only `px-4`), unlike the old
 * `src/lib/cn.ts` stand-in this replaces. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
