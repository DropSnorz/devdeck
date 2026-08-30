import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { Prec, RangeSetBuilder, type Extension } from '@codemirror/state'
import { LOG_PATTERNS, TIMESTAMP_PATTERN, type LogPatternGroup } from './logPatterns'

const GROUP_CLASS: Record<LogPatternGroup, string> = {
  severe: 'cm-log-severe',
  caution: 'cm-log-caution',
  auth: 'cm-log-auth',
}

interface DecorationRange {
  from: number
  to: number
  className: string
}

/** Scans only `view.visibleRanges`, not the whole document, same as any
 * other CodeMirror decoration plugin. A match straddling two visible
 * ranges is missed; an accepted tradeoff shared with bracket matching etc. */
function buildDecorations(view: EditorView): DecorationSet {
  const ranges: DecorationRange[] = []
  for (const { from: rangeFrom, to: rangeTo } of view.visibleRanges) {
    const text = view.state.doc.sliceString(rangeFrom, rangeTo)

    const timestampRe = new RegExp(TIMESTAMP_PATTERN.source, TIMESTAMP_PATTERN.flags)
    let timestampMatch: RegExpExecArray | null
    while ((timestampMatch = timestampRe.exec(text))) {
      ranges.push({
        from: rangeFrom + timestampMatch.index,
        to: rangeFrom + timestampMatch.index + timestampMatch[0].length,
        className: 'cm-log-timestamp',
      })
    }

    for (const def of LOG_PATTERNS) {
      // pattern and embeddedPattern both get the same highlight class.
      for (const patternRe of [def.pattern, def.embeddedPattern]) {
        const re = new RegExp(patternRe.source, patternRe.flags)
        let match: RegExpExecArray | null
        while ((match = re.exec(text))) {
          ranges.push({
            from: rangeFrom + match.index,
            to: rangeFrom + match.index + match[0].length,
            className: GROUP_CLASS[def.group],
          })
          if (match[0].length === 0) re.lastIndex += 1
        }
      }
    }
  }

  // RangeSetBuilder needs ascending order. Dedupe in case pattern and
  // embeddedPattern both matched the same span.
  ranges.sort((a, b) => a.from - b.from || a.to - b.to)
  const builder = new RangeSetBuilder<Decoration>()
  let previous: DecorationRange | null = null
  for (const range of ranges) {
    if (previous && previous.from === range.from && previous.to === range.to) continue
    builder.add(range.from, range.to, Decoration.mark({ class: range.className }))
    previous = range
  }
  return builder.finish()
}

const logDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

/** Colors mirror `mergeTheme.ts`'s approach: `--color-destructive` and
 * `--color-muted-foreground` already flip under `.dark`, so only the raw
 * amber/purple shades need an explicit light/dark split. `baseTheme` +
 * `Prec.highest` so these decorations outrank CodeMirror's own base styles. */
const logHighlightTheme = EditorView.baseTheme({
  '.cm-log-timestamp': { color: 'var(--color-muted-foreground)' },
  '.cm-log-severe': { color: 'var(--color-destructive)' },
  '&light .cm-log-caution': { color: 'var(--color-amber-600)' },
  '&dark .cm-log-caution': { color: 'var(--color-amber-400)' },
  '&light .cm-log-auth': { color: 'var(--color-purple-600)' },
  '&dark .cm-log-auth': { color: 'var(--color-purple-400)' },
})

/** Regex-based syntax highlighting for pasted logs: timestamps plus the
 * grep-able patterns in `logPatterns.ts`. No lezer grammar; logs have no
 * structural grammar to parse. */
export function logHighlightExtension(): Extension {
  return [logDecorationsPlugin, Prec.highest(logHighlightTheme)]
}
