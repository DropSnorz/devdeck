/** Shared between the react-grid-layout config and the keyboard-accessible
 * move/resize dialog, so both agree on the same grid geometry. */
export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 90
export const GRID_MARGIN: [number, number] = [16, 16]
// A generous ceiling rather than a real limit — just keeps the "height"
// number input in the keyboard fallback dialog from accepting nonsense.
export const GRID_MAX_ROW_SPAN = 20

// Below this width the grid becomes a read-only stacked list — touch
// drag/resize is unreliable and there isn't enough room to see an
// "assembled dashboard" anyway.
export const EDITABLE_BREAKPOINT = '(min-width: 768px)'
