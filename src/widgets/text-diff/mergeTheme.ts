import { useMemo } from 'react'
import { EditorView } from '@codemirror/view'
import { Prec, type Extension } from '@codemirror/state'

/** Diff-chunk highlighting for `MergeDiffView`'s two panes, replacing
 * `@codemirror/merge`'s own hardcoded reds/greens with this app's
 * `success`/`destructive` tokens — the same semantic pairing
 * `TextDiffWidget.tsx`'s old `LINE_CLASS`/`SEGMENT_CLASS` used
 * (`bg-success/15 text-success` for additions, `bg-destructive/15
 * text-destructive` for deletions), translated into CodeMirror's CSS-in-JS
 * theme form since these are CodeMirror decorations, not DOM elements
 * Tailwind classes can reach.
 *
 * Built with `EditorView.baseTheme` rather than `EditorView.theme` — the
 * `&light`/`&dark` selector variants used below (to match
 * `@codemirror/merge`'s own base theme selector-for-selector, see below)
 * only resolve under `baseTheme`; `EditorView.theme(...)`'s selector
 * parser rejects them outright ("Unsupported selector: &light"). Since
 * every value here already comes from a CSS custom property that flips
 * itself via the app's `.dark` class (the same reasoning `CodeEditor.tsx`'s
 * `useAppEditorTheme` documents), the light/dark split only exists to keep
 * selector shape — not the actual color values — identical between modes.
 * Which variant applies is decided elsewhere: `useAppEditorTheme(isDark)`'s
 * own `EditorView.theme(spec, { dark: isDark })` call sets that shared
 * per-state flag, so this extension itself has no `isDark` input of its
 * own and never needs reconfiguring on a theme toggle.
 *
 * Selector shape matters here beyond just "which variant applies": base
 * themes install at `Prec.lowest`, so this only reliably overrides them
 * when its own selectors carry *at least* the same CSS specificity — a
 * plain `&.cm-merge-a .cm-changedText` (no light/dark class) would lose to
 * `&light.cm-merge-a .cm-changedText` regardless of `Prec.highest` below,
 * since precedence only breaks ties between equal-specificity rules. */
export function useMergeChunkTheme(): Extension {
  return useMemo(() => {
    const theme = EditorView.baseTheme({
      // Whole-line background for a changed line — "a" is the original/
      // removed side, "b" the changed/added side. No light/dark split
      // needed here: unlike `.cm-changedText` below, `@codemirror/merge`'s
      // own equivalent rules aren't light/dark-scoped either.
      '&.cm-merge-a .cm-changedLine': {
        backgroundColor: 'color-mix(in oklab, var(--color-destructive) 15%, transparent)',
      },
      '&.cm-merge-b .cm-changedLine': {
        backgroundColor: 'color-mix(in oklab, var(--color-success) 15%, transparent)',
      },
      // Character-level highlight within a changed line (what precisely
      // differs, not just "this line differs") — an underline rather than
      // a second background layer, so it reads on top of the whole-line
      // tint above instead of fighting it.
      '&light.cm-merge-a .cm-changedText': {
        background:
          'linear-gradient(var(--color-destructive), var(--color-destructive)) bottom/100% 2px no-repeat',
      },
      '&dark.cm-merge-a .cm-changedText': {
        background:
          'linear-gradient(var(--color-destructive), var(--color-destructive)) bottom/100% 2px no-repeat',
      },
      '&light.cm-merge-b .cm-changedText': {
        background: 'linear-gradient(var(--color-success), var(--color-success)) bottom/100% 2px no-repeat',
      },
      '&dark.cm-merge-b .cm-changedText': {
        background: 'linear-gradient(var(--color-success), var(--color-success)) bottom/100% 2px no-repeat',
      },
      // The "N unchanged lines" collapsed-region placeholder — restyled
      // off the app's own muted/border tokens instead of the library's
      // fixed light/dark grays, so it reads as part of the app rather than
      // a foreign widget.
      '.cm-collapsedLines': {
        fontFamily: 'var(--font-sans)',
      },
      '&light .cm-collapsedLines': {
        color: 'var(--color-muted-foreground)',
        background: 'var(--color-muted)',
      },
      '&dark .cm-collapsedLines': {
        color: 'var(--color-muted-foreground)',
        background: 'var(--color-muted)',
      },
    })
    return Prec.highest(theme)
  }, [])
}
