/** The Astrelite brand mark — same path data as astrelite.com's own
 * favicon/wordmark lockup, recolored via `currentColor` instead of a fixed
 * white/black so it follows this app's own light/dark theme. */
export function AstreliteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 104 94"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinejoin="miter"
      strokeMiterlimit={8}
      className={className}
      aria-hidden="true"
    >
      <path d="M58 4 L96 44 L66 90 L18 72 L8 30 Z" />
      <path d="M42 44 L58 4 M42 44 L96 44 M42 44 L18 72" />
    </svg>
  )
}
