import type { DiffStats } from './computeTextDiff'

/** Structural subset of `@codemirror/merge`'s `Chunk` class — every helper
 * here only needs the four boundary offsets, not the real class (which
 * requires a live CodeMirror `Text`/`EditorState` to construct), so this
 * stays a plain data shape both `MergeDiffView` (real `Chunk[]`) and this
 * file's own tests (plain object literals) can share without a CodeMirror
 * dependency leaking into the test file. Positions are character offsets
 * into each document, and always line-aligned — `@codemirror/merge`
 * guarantees a chunk starts at the beginning of its first changed line and
 * ends one past the end of its last changed line. */
export interface ChunkLike {
  fromA: number
  toA: number
  fromB: number
  toB: number
}

/** Splits a line-aligned slice into individual lines, mirroring the same
 * "strip exactly one trailing newline first" convention `computeTextDiff.ts`
 * used for jsdiff hunks — a slice ending in '\n' doesn't produce a spurious
 * trailing empty line, and an empty slice (e.g. a chunk with no lines on
 * this side, a pure insertion/deletion) produces zero lines rather than one. */
function splitLines(text: string): string[] {
  if (text === '') return []
  return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
}

/** Line-level +/- counts for a line-mode diff, derived from
 * `@codemirror/merge`'s own chunk list instead of a parallel jsdiff
 * computation — the two could otherwise (rarely) disagree with what's
 * actually highlighted on screen. */
export function chunkStats(chunks: readonly ChunkLike[], docA: string, docB: string): DiffStats {
  let additions = 0
  let deletions = 0
  for (const chunk of chunks) {
    deletions += splitLines(docA.slice(chunk.fromA, chunk.toA)).length
    additions += splitLines(docB.slice(chunk.fromB, chunk.toB)).length
  }
  return { additions, deletions }
}

/** Which chunk (0-based) a cursor/selection position on the A side is
 * currently in or nearest to — the first chunk whose A-range ends at or
 * after `headPos`, falling back to the last chunk once past the end of the
 * document. Only used for the "Change X of Y" display label; the actual
 * jump is handled by `@codemirror/merge`'s own `goToNextChunk`/
 * `goToPreviousChunk` commands, which this doesn't need to duplicate. */
export function currentChunkIndex(chunks: readonly ChunkLike[], headPos: number): number {
  if (chunks.length === 0) return -1
  const index = chunks.findIndex((chunk) => chunk.toA >= headPos)
  return index === -1 ? chunks.length - 1 : index
}

/** Reconstructs the git-style `+`/`-`/`  ` prefixed copy-to-clipboard text
 * `lineDiffToText` used to produce, but from `@codemirror/merge`'s chunk
 * list plus the two live documents instead of a parallel jsdiff computation
 * — walks the unchanged gap before each chunk, then the chunk's removed and
 * added lines, then (after the loop) the final unchanged tail. */
export function chunksToDiffText(docA: string, docB: string, chunks: readonly ChunkLike[]): string {
  const lines: string[] = []
  // Unchanged spans are only ever read off `docA` — by definition they're
  // character-identical in `docB` too, so there's no separate `docB` cursor
  // to track alongside this one.
  let posA = 0
  for (const chunk of chunks) {
    for (const line of splitLines(docA.slice(posA, chunk.fromA))) lines.push(`  ${line}`)
    for (const line of splitLines(docA.slice(chunk.fromA, chunk.toA))) lines.push(`- ${line}`)
    for (const line of splitLines(docB.slice(chunk.fromB, chunk.toB))) lines.push(`+ ${line}`)
    posA = chunk.toA
  }
  for (const line of splitLines(docA.slice(posA))) lines.push(`  ${line}`)
  return lines.join('\n')
}
