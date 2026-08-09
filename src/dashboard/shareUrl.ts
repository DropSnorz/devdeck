import type { Dashboard } from '@/types/layout'
import { encodeWorkspace, LAYOUT_HASH_PARAM } from './layoutCodec'

/** Builds a URL that reproduces the entire workspace (every dashboard, not
 * just the active one — and their layouts only, not widget content) when
 * opened. Encoded into the fragment (`#layout=...`), not a query param, so
 * it's never sent to a server. */
export function buildShareUrl(dashboards: Dashboard[], activeDashboardId: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  const hashParams = new URLSearchParams()
  hashParams.set(LAYOUT_HASH_PARAM, encodeWorkspace(dashboards, activeDashboardId))
  url.hash = hashParams.toString()
  return url.toString()
}
