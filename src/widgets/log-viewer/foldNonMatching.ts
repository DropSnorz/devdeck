import { codeFolding } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { Prec, type Extension } from '@codemirror/state'
import type { MatchRange } from './logPatterns'

export interface LineRange {
  from: number
  to: number
}

/** Character-offset ranges of the lines to fold for "hide non-matching
 * lines": every line more than `contextLines` lines from the nearest match,
 * grep `-C`-style. Pure and CodeMirror-independent. Returns nothing to fold
 * when there are no matches (folding the whole document would be worse
 * than doing nothing). */
export function computeFoldRanges(text: string, matches: readonly MatchRange[], contextLines: number): LineRange[] {
  if (matches.length === 0) return []

  // Manual line-offset table (not a CodeMirror `Text`) keeps this pure.
  const lines: LineRange[] = []
  let lineStart = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lines.push({ from: lineStart, to: i })
      lineStart = i + 1
    }
  }
  lines.push({ from: lineStart, to: text.length })

  // Binary search for the line a given offset falls in.
  const lineIndexAt = (offset: number) => {
    let lo = 0
    let hi = lines.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (lines[mid].to < offset) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  const keep = new Array<boolean>(lines.length).fill(false)
  for (const match of matches) {
    const startLine = lineIndexAt(match.from)
    // Handles a zero-width match too, just in case.
    const endLine = lineIndexAt(Math.max(match.from, match.to - 1))
    const from = Math.max(0, startLine - contextLines)
    const to = Math.min(lines.length - 1, endLine + contextLines)
    for (let li = from; li <= to; li++) keep[li] = true
  }

  const hidden: LineRange[] = []
  let runStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (!keep[i]) {
      if (runStart === -1) runStart = i
    } else if (runStart !== -1) {
      hidden.push({ from: lines[runStart].from, to: lines[i - 1].to })
      runStart = -1
    }
  }
  if (runStart !== -1) hidden.push({ from: lines[runStart].from, to: lines[lines.length - 1].to })

  // A lone blank line produces a zero-length range (from === to).
  // CodeMirror's fold decoration throws on that, so drop it. Nothing lost:
  // an empty line takes no visible space anyway.
  return hidden.filter((range) => range.to > range.from)
}

/** Replaces `codeFolding()`'s bare "…" placeholder with a "N lines hidden"
 * pill, keeping the default click-to-unfold behavior. */
function foldPlaceholderDOM(_view: EditorView, onclick: (event: Event) => void, lineCount: number): HTMLElement {
  const el = document.createElement('span')
  el.className = 'cm-log-fold-placeholder'
  el.textContent = `⋯ ${lineCount} line${lineCount === 1 ? '' : 's'} hidden`
  el.title = 'Click to show'
  el.onclick = onclick
  return el
}

const foldPlaceholderTheme = EditorView.baseTheme({
  '.cm-log-fold-placeholder': {
    display: 'inline-block',
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '0 6px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-muted-foreground)',
    backgroundColor: 'var(--color-muted)',
  },
  '.cm-log-fold-placeholder:hover': {
    color: 'var(--color-foreground)',
  },
})

/** Only customizes how a fold renders. Folding/unfolding is done
 * imperatively from `LogViewerWidget.tsx` via `foldEffect`/`unfoldAll`. */
export function foldDisplayExtension(): Extension {
  return [
    codeFolding({
      preparePlaceholder: (state, range) =>
        state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number + 1,
      placeholderDOM: (view, onclick, prepared) => foldPlaceholderDOM(view, onclick, prepared as number),
    }),
    Prec.highest(foldPlaceholderTheme),
  ]
}
