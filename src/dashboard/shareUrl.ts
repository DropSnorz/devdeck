import type { DashboardWidgetInstance } from '@/types/layout'
import { encodeLayout, LAYOUT_HASH_PARAM } from './layoutCodec'

/** Builds a URL that reproduces this exact widget layout (not content) when
 * opened — the payload for both the "copy link" and QR code actions. Encoded
 * into the fragment (`#layout=...`), not a query param, so it's never sent
 * to a server. */
export function buildShareUrl(widgets: DashboardWidgetInstance[]): string {
  const url = new URL(window.location.href)
  url.search = ''
  const hashParams = new URLSearchParams()
  hashParams.set(LAYOUT_HASH_PARAM, encodeLayout(widgets))
  url.hash = hashParams.toString()
  return url.toString()
}
