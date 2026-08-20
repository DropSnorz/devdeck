export interface PixelCoordinates {
  px: number
  py: number
}

/** Maps a client (viewport) point onto a source-resolution pixel coordinate
 * of a canvas displayed with `object-fit: contain` — i.e. undoes the
 * letterboxing that CSS applies whenever the canvas's own aspect ratio
 * doesn't match its layout box. Returns null when the point falls in the
 * letterbox padding rather than on the rendered image itself. */
export function mapClientPointToCanvasPixel(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): PixelCoordinates | null {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return null

  const boxAspect = rect.width / rect.height
  const imageAspect = canvas.width / canvas.height
  const renderedWidth = imageAspect > boxAspect ? rect.width : rect.height * imageAspect
  const renderedHeight = imageAspect > boxAspect ? rect.width / imageAspect : rect.height
  const offsetX = (rect.width - renderedWidth) / 2
  const offsetY = (rect.height - renderedHeight) / 2

  const localX = clientX - rect.left - offsetX
  const localY = clientY - rect.top - offsetY
  if (localX < 0 || localY < 0 || localX > renderedWidth || localY > renderedHeight) return null

  return {
    px: Math.min(canvas.width - 1, Math.max(0, Math.round((localX / renderedWidth) * canvas.width))),
    py: Math.min(canvas.height - 1, Math.max(0, Math.round((localY / renderedHeight) * canvas.height))),
  }
}
