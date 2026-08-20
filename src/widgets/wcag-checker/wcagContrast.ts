import type { Colord } from 'colord'

/** Linearizes one sRGB channel (0-255) per the WCAG relative luminance
 * formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a color, 0 (black) to 1 (white). Alpha is
 * ignored — WCAG contrast math assumes two opaque colors, same as every
 * other contrast checker, so a translucent input is treated as if it were
 * fully opaque at its own r/g/b. */
export function relativeLuminance(color: Colord): number {
  const { r, g, b } = color.toRgb()
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two colors, from 1 (identical) to 21 (black
 * vs white). Argument order doesn't matter — the lighter color always ends
 * up as the numerator. */
export function contrastRatio(a: Colord, b: Colord): number {
  const lA = relativeLuminance(a)
  const lB = relativeLuminance(b)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

export type WcagCriterionKey = 'normalAA' | 'largeAA' | 'normalAAA' | 'largeAAA' | 'uiComponents'

export interface WcagCheck {
  key: WcagCriterionKey
  label: string
  threshold: number
  pass: boolean
}

/** The five contrast thresholds WCAG 2.x defines: 1.4.3 (AA) / 1.4.6 (AAA)
 * for text, and 1.4.11 for non-text UI components & graphical objects. */
const CRITERIA: { key: WcagCriterionKey; label: string; threshold: number }[] = [
  { key: 'normalAA', label: 'AA — normal text', threshold: 4.5 },
  { key: 'largeAA', label: 'AA — large text', threshold: 3 },
  { key: 'normalAAA', label: 'AAA — normal text', threshold: 7 },
  { key: 'largeAAA', label: 'AAA — large text', threshold: 4.5 },
  { key: 'uiComponents', label: 'UI components & graphics', threshold: 3 },
]

export function evaluateWcag(ratio: number): WcagCheck[] {
  return CRITERIA.map((criterion) => ({ ...criterion, pass: ratio >= criterion.threshold }))
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}
