// Captures a single real frame of the current browser tab via the native
// screen/tab-capture API, rather than trying to redraw the DOM in JS (which
// is what html2canvas-style libraries do — and why they break on modern CSS
// color functions like oklch()/color-mix() that Tailwind v4 uses throughout
// this app's theme). This capture is pixel-perfect and can't go stale as
// CSS features evolve, at the cost of a one-time native "choose what to
// share" permission prompt.
export const DISPLAY_CAPTURE_SUPPORTED = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

// Bounds how long we wait for the captured stream to produce a frame — a
// stalled/never-firing loadeddata (no error either) would otherwise hang
// startPicking() in 'requesting' forever with no way to recover.
const FRAME_READY_TIMEOUT_MS = 5000

export async function captureViewportFrame(): Promise<HTMLCanvasElement> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    // Chrome-only hints that restrict/streamline the picker to the current
    // tab; ignored elsewhere per WebIDL (unrecognized dictionary members
    // are dropped, not an error), where the user picks a tab/window/screen
    // manually instead.
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
  })
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    if (video.readyState < video.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeoutId)
          video.removeEventListener('loadeddata', handleLoadedData)
          video.removeEventListener('error', handleError)
        }
        const handleLoadedData = () => {
          cleanup()
          resolve()
        }
        const handleError = () => {
          cleanup()
          reject(new Error('Video capture failed to load'))
        }
        const timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('Timed out waiting for the captured video frame'))
        }, FRAME_READY_TIMEOUT_MS)
        video.addEventListener('loadeddata', handleLoadedData, { once: true })
        video.addEventListener('error', handleError, { once: true })
      })
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(video, 0, 0)
    return canvas
  } finally {
    // Stop sharing immediately — only one frame is needed, so there's no
    // reason to leave the "this tab is being shared" indicator up.
    stream.getTracks().forEach((track) => track.stop())
  }
}
