/** Pure detection/cleaning logic for the Invisible Character Cleaner widget.
 * No React here so it can be unit-tested and reused without a DOM. */

export type InvisibleCategory = 'zero-width' | 'bidi-control' | 'tag' | 'variation-selector' | 'control' | 'space'

export const CATEGORY_LABELS: Record<InvisibleCategory, string> = {
  'zero-width': 'Zero-width',
  'bidi-control': 'Bidi control',
  tag: 'Hidden Unicode tag',
  'variation-selector': 'Variation selector',
  control: 'Control character',
  space: 'Non-standard space',
}

export interface CharInfo {
  name: string
  /** Short (2-5 char) label rendered inline in place of the invisible
   * character itself, since the character has no width of its own to
   * highlight. */
  shortLabel: string
  category: InvisibleCategory
}

function hex(codePoint: number): string {
  return codePoint.toString(16).toUpperCase().padStart(4, '0')
}

// Individually named code points worth calling out by their real name
// rather than a generic "Control character (U+xxxx)" fallback.
const NAMED_CHARS: Record<number, CharInfo> = {
  0x200b: { name: 'Zero Width Space', shortLabel: 'ZWSP', category: 'zero-width' },
  0x200c: { name: 'Zero Width Non-Joiner', shortLabel: 'ZWNJ', category: 'zero-width' },
  0x200d: { name: 'Zero Width Joiner', shortLabel: 'ZWJ', category: 'zero-width' },
  0x2060: { name: 'Word Joiner', shortLabel: 'WJ', category: 'zero-width' },
  0xfeff: { name: 'Zero Width No-Break Space (BOM)', shortLabel: 'BOM', category: 'zero-width' },
  0x180e: { name: 'Mongolian Vowel Separator', shortLabel: 'MVS', category: 'zero-width' },
  0x00ad: { name: 'Soft Hyphen', shortLabel: 'SHY', category: 'zero-width' },
  0x034f: { name: 'Combining Grapheme Joiner', shortLabel: 'CGJ', category: 'zero-width' },
  0x061c: { name: 'Arabic Letter Mark', shortLabel: 'ALM', category: 'bidi-control' },
  0x200e: { name: 'Left-to-Right Mark', shortLabel: 'LRM', category: 'bidi-control' },
  0x200f: { name: 'Right-to-Left Mark', shortLabel: 'RLM', category: 'bidi-control' },
  0x202a: { name: 'Left-to-Right Embedding', shortLabel: 'LRE', category: 'bidi-control' },
  0x202b: { name: 'Right-to-Left Embedding', shortLabel: 'RLE', category: 'bidi-control' },
  0x202c: { name: 'Pop Directional Formatting', shortLabel: 'PDF', category: 'bidi-control' },
  0x202d: { name: 'Left-to-Right Override', shortLabel: 'LRO', category: 'bidi-control' },
  0x202e: { name: 'Right-to-Left Override', shortLabel: 'RLO', category: 'bidi-control' },
  0x2066: { name: 'Left-to-Right Isolate', shortLabel: 'LRI', category: 'bidi-control' },
  0x2067: { name: 'Right-to-Left Isolate', shortLabel: 'RLI', category: 'bidi-control' },
  0x2068: { name: 'First Strong Isolate', shortLabel: 'FSI', category: 'bidi-control' },
  0x2069: { name: 'Pop Directional Isolate', shortLabel: 'PDI', category: 'bidi-control' },
  0x2028: { name: 'Line Separator', shortLabel: 'LS', category: 'control' },
  0x2029: { name: 'Paragraph Separator', shortLabel: 'PS', category: 'control' },
  0x00a0: { name: 'No-Break Space', shortLabel: 'NBSP', category: 'space' },
  0x1680: { name: 'Ogham Space Mark', shortLabel: 'SP', category: 'space' },
  0x202f: { name: 'Narrow No-Break Space', shortLabel: 'NNBSP', category: 'space' },
  0x205f: { name: 'Medium Mathematical Space', shortLabel: 'MMSP', category: 'space' },
  0x3000: { name: 'Ideographic Space', shortLabel: 'SP', category: 'space' },
  0xe0001: { name: 'Language Tag (deprecated)', shortLabel: 'TAG', category: 'tag' },
  0xe007f: { name: 'Cancel Tag', shortLabel: 'TAG', category: 'tag' },
}

// U+2000-U+200A: EN QUAD .. HAIR SPACE, in code point order.
const THIN_SPACE_NAMES = [
  'En Quad',
  'Em Quad',
  'En Space',
  'Em Space',
  'Three-Per-Em Space',
  'Four-Per-Em Space',
  'Six-Per-Em Space',
  'Figure Space',
  'Punctuation Space',
  'Thin Space',
  'Hair Space',
]

/** Classifies a single Unicode code point as an invisible/suspicious
 * character, or returns null for anything that should render normally
 * (including ordinary tab/newline/carriage-return whitespace). */
export function classifyCodePoint(codePoint: number): CharInfo | null {
  const named = NAMED_CHARS[codePoint]
  if (named) return named

  if (codePoint >= 0x2000 && codePoint <= 0x200a) {
    return { name: THIN_SPACE_NAMES[codePoint - 0x2000], shortLabel: 'SP', category: 'space' }
  }

  // Unicode Tag block: U+E0020-U+E007E mirror printable ASCII (U+0020-U+007E)
  // shifted up by 0xE0000. Invisible in every mainstream renderer, but a
  // model reading raw text still sees the ASCII they decode to, which is
  // how "ASCII smuggling" prompt-injection payloads hide instructions
  // inside otherwise unremarkable text.
  if (codePoint >= 0xe0020 && codePoint <= 0xe007e) {
    const ascii = String.fromCharCode(codePoint - 0xe0000)
    return { name: `Tag Character (decodes to "${ascii}")`, shortLabel: 'TAG', category: 'tag' }
  }

  if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) {
    return { name: `Variation Selector-${codePoint - 0xfe00 + 1}`, shortLabel: 'VS', category: 'variation-selector' }
  }
  if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) {
    return {
      name: `Variation Selector-${codePoint - 0xe0100 + 17}`,
      shortLabel: 'VS',
      category: 'variation-selector',
    }
  }

  // C0 controls, excluding the three whitespace controls every text editor
  // treats as normal (tab, newline, carriage return).
  if (codePoint <= 0x1f && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d) {
    return { name: `Control Character (U+${hex(codePoint)})`, shortLabel: 'CTRL', category: 'control' }
  }
  if (codePoint === 0x7f) {
    return { name: 'Delete', shortLabel: 'DEL', category: 'control' }
  }
  if (codePoint >= 0x80 && codePoint <= 0x9f) {
    return { name: `Control Character (U+${hex(codePoint)})`, shortLabel: 'CTRL', category: 'control' }
  }

  return null
}

export interface CharMatch extends CharInfo {
  index: number
  char: string
  codePoint: number
}

/** Scans text for invisible/suspicious characters, iterating by Unicode
 * code point (not UTF-16 code unit) so supplementary-plane characters like
 * the Unicode Tag block are matched whole, not as broken surrogate halves.
 * `index` is a UTF-16 code-unit offset, so it stays valid for
 * text.slice(). */
export function scanText(text: string): CharMatch[] {
  const matches: CharMatch[] = []
  let index = 0
  for (const char of text) {
    const codePoint = char.codePointAt(0)!
    const info = classifyCodePoint(codePoint)
    if (info) matches.push({ ...info, index, char, codePoint })
    index += char.length
  }
  return matches
}

/** Strips detected characters out of the text. Non-standard spaces are
 * normalized to a regular space rather than deleted, so words on either
 * side don't collide; everything else (zero-width, bidi, tag, variation
 * selector, control) is removed outright. */
export function cleanText(text: string): string {
  let result = ''
  for (const char of text) {
    const info = classifyCodePoint(char.codePointAt(0)!)
    if (!info) result += char
    else if (info.category === 'space') result += ' '
  }
  return result
}

export interface MatchGroup {
  name: string
  shortLabel: string
  category: InvisibleCategory
  count: number
}

/** Collapses matches into one row per distinct character name, in order of
 * first appearance, for a summary list. */
export function groupMatches(matches: CharMatch[]): MatchGroup[] {
  const order: string[] = []
  const counts = new Map<string, MatchGroup>()
  for (const match of matches) {
    const existing = counts.get(match.name)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(match.name, { name: match.name, shortLabel: match.shortLabel, category: match.category, count: 1 })
      order.push(match.name)
    }
  }
  return order.map((name) => counts.get(name)!)
}

export type PreviewSegment =
  { kind: 'text'; text: string } | { kind: 'invisible'; shortLabel: string; count: number; label: string }

/** Turns text + its matches into a render-ready sequence of plain-text and
 * invisible-character segments, for a preview that highlights matches
 * inline. Contiguous matches (a run of tag characters decoding a hidden
 * message, several zero-width spaces in a row) collapse into a single
 * segment with a count instead of one badge per character, since e.g. a
 * hidden-tag payload can be dozens of characters long. */
export function buildPreviewSegments(text: string, matches: CharMatch[]): PreviewSegment[] {
  const segments: PreviewSegment[] = []
  let cursor = 0
  let i = 0
  while (i < matches.length) {
    const match = matches[i]
    if (match.index > cursor) segments.push({ kind: 'text', text: text.slice(cursor, match.index) })

    let end = match.index + match.char.length
    const namesInRun = [match.name]
    let j = i + 1
    while (j < matches.length && matches[j].index === end) {
      end += matches[j].char.length
      if (!namesInRun.includes(matches[j].name)) namesInRun.push(matches[j].name)
      j++
    }

    const count = j - i
    const label = count === 1 ? `${match.name} (U+${hex(match.codePoint)})` : `${namesInRun.join(', ')} × ${count}`
    segments.push({ kind: 'invisible', shortLabel: match.shortLabel, count, label })
    cursor = end
    i = j
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}

/** Reconstructs any ASCII text hidden inside runs of Unicode Tag
 * characters — the mechanism behind "ASCII smuggling" prompt injection,
 * where instructions invisible to a human reader are appended to text an
 * LLM will still read literally. Consecutive tag characters decode into
 * one run; anything else (including a Cancel Tag or Language Tag) ends the
 * current run. Empty/whitespace-only runs are dropped. */
export function extractHiddenTagText(text: string): string[] {
  const runs: string[] = []
  let current = ''
  for (const char of text) {
    const codePoint = char.codePointAt(0)!
    if (codePoint >= 0xe0020 && codePoint <= 0xe007e) {
      current += String.fromCharCode(codePoint - 0xe0000)
      continue
    }
    if (current.trim()) runs.push(current)
    current = ''
  }
  if (current.trim()) runs.push(current)
  return runs
}
