import '@testing-library/jest-dom/vitest'

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
