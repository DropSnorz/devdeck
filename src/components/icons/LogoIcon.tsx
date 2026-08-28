import { cn } from '@/lib/utils'

/** The localgrid mark: four panels on a 3×3 field. A main pane, a right
 * rail, a bottom tray, and one accent tile standing in for the local
 * process that's live on your machine. Three panels inherit `currentColor`
 * (so it recolors with `text-*` like any icon); the accent tile is pinned to
 * a fixed blue (#65a1fe, matching favicon.svg's accent tile) so it stays
 * that color regardless of the surrounding text color or theme. See the
 * brand board for the full rationale. */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('shrink-0', className)} aria-hidden="true">
      <rect x="0" y="0" width="64" height="64" rx="6" fill="currentColor" />
      <rect x="72" y="0" width="28" height="64" rx="6" fill="currentColor" opacity="0.55" />
      <rect x="0" y="72" width="64" height="28" rx="6" fill="currentColor" opacity="0.5" />
      <rect x="72" y="72" width="28" height="28" rx="6" fill="#65a1fe" />
    </svg>
  )
}
