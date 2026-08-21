import { colord, type Colord } from 'colord'

/** Linearizes one sRGB channel (0-255) per the WCAG relative luminance
 * formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of an *opaque* color, 0 (black) to 1 (white).
 * Callers are responsible for alpha-compositing a translucent color down to
 * opaque first (see `flattenOver`) — reading `r`/`g`/`b` straight off a
 * translucent color and ignoring `a` would silently score its contrast as
 * if it were fully opaque, which is not what actually renders. */
export function relativeLuminance(color: Colord): number {
  const { r, g, b } = color.toRgb()
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** Alpha-composites `top` over `bottom`, treating `bottom` as fully opaque.
 * `top`'s own alpha is what's blended; `bottom`'s alpha (if any) is ignored,
 * so flatten `bottom` first if it's translucent too — `contrastRatio` does
 * exactly that. */
function flattenOver(top: Colord, bottom: Colord): Colord {
  const t = top.toRgb()
  const b = bottom.toRgb()
  return colord({
    r: t.r * t.a + b.r * (1 - t.a),
    g: t.g * t.a + b.g * (1 - t.a),
    b: t.b * t.a + b.b * (1 - t.a),
  })
}

/** WCAG contrast ratio between a foreground and background color, from 1
 * (identical) to 21 (black vs white). A translucent color's rendered
 * contrast depends on what's behind it, so alpha can't just be ignored — a
 * 50%-alpha black foreground on a white background renders far lighter than
 * opaque black would, at roughly 4:1 rather than 21:1. Both colors are
 * alpha-composited down to opaque before measuring luminance: the
 * background is flattened over white first (the assumed page backdrop) if
 * it's translucent, then the foreground is flattened over that resolved
 * background. */
export function contrastRatio(foreground: Colord, background: Colord): number {
  const opaqueBackground = background.alpha() < 1 ? flattenOver(background, colord('#ffffff')) : background
  const opaqueForeground = foreground.alpha() < 1 ? flattenOver(foreground, opaqueBackground) : foreground
  const lFg = relativeLuminance(opaqueForeground)
  const lBg = relativeLuminance(opaqueBackground)
  const lighter = Math.max(lFg, lBg)
  const darker = Math.min(lFg, lBg)
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
