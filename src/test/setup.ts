import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useWidgetStateStore } from '@/widgets/useWidgetState'

// Widget content now lives in a store keyed by instanceId rather than local
// component state, so a fresh `render()` no longer guarantees a fresh
// value — tests that reuse the same instanceId across `it()` blocks (a
// common pattern, e.g. `instanceId="test"`) would otherwise silently bleed
// content into each other. Reset centrally here instead of requiring every
// widget test file to remember a unique id per test.
afterEach(() => {
  useWidgetStateStore.setState({ values: {} })
})

// jsdom doesn't implement matchMedia — useMediaQuery (dark-mode detection,
// the editable-grid breakpoint) needs it to exist even if tests don't care
// about its result.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// jsdom doesn't implement ResizeObserver — cmdk uses it internally to size
// its results list.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom doesn't implement scrollIntoView — cmdk calls it when the selected
// item changes.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
