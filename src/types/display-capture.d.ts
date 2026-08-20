export {}

// Chrome-only hints on getDisplayMedia() that restrict/streamline the
// "choose what to share" picker to the current tab. Not yet in TS's DOM
// lib. Safe to pass even where unsupported — see pageCapture.ts.
declare global {
  interface DisplayMediaStreamOptions {
    preferCurrentTab?: boolean
    selfBrowserSurface?: 'include' | 'exclude'
  }
}
