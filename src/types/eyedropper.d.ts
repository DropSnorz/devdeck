export {}

// Chromium's window.EyeDropper API — not in TS's DOM lib yet.
// https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper
declare global {
  interface EyeDropperOpenOptions {
    signal?: AbortSignal
  }

  interface EyeDropperResult {
    sRGBHex: string
  }

  interface EyeDropper {
    open(options?: EyeDropperOpenOptions): Promise<EyeDropperResult>
  }

  interface Window {
    EyeDropper?: { new (): EyeDropper }
  }
}
