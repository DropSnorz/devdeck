import { useEffect, useState } from 'react'
import type { DashboardLayoutV1 } from '@/types/layout'
import { decodeLayout, LAYOUT_HASH_PARAM } from './layoutCodec'

function clearLayoutParam() {
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.slice(1))
  hashParams.delete(LAYOUT_HASH_PARAM)
  url.hash = hashParams.toString()
  window.history.replaceState(null, '', url.toString())
}

interface BootstrapState {
  pendingLayout: DashboardLayoutV1 | null
  decodeError: string | null
}

const EMPTY_STATE: BootstrapState = { pendingLayout: null, decodeError: null }

// Read once, synchronously, as a useState lazy initializer — the sanctioned
// place to read an environment value (here, the URL) exactly once on mount —
// rather than via an effect that would call setState on every mount.
function readInitialState(): BootstrapState {
  const encoded = new URLSearchParams(window.location.hash.slice(1)).get(
    LAYOUT_HASH_PARAM,
  )
  if (!encoded) return EMPTY_STATE

  const result = decodeLayout(encoded)
  return result.ok
    ? { pendingLayout: result.layout, decodeError: null }
    : { pendingLayout: null, decodeError: result.error }
}

/** Surfaces a `#layout=` share link found on first load. A valid link is
 * handed to `ShareLoadPrompt` to confirm before it replaces the local
 * dashboard (per the confirm-before-overwrite decision — never silent). The
 * fragment is stripped from the URL either way so refreshing doesn't
 * re-prompt. */
export function useShareLinkBootstrap() {
  const [{ pendingLayout, decodeError }, setState] = useState(readInitialState)

  useEffect(() => {
    if (!pendingLayout && !decodeError) return
    clearLayoutParam()
    if (!decodeError) return
    const timeoutId = setTimeout(() => {
      setState((state) => ({ ...state, decodeError: null }))
    }, 6000)
    return () => clearTimeout(timeoutId)
    // Only meant to run once, against the state this hook was initialized with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = () => {
    setState(EMPTY_STATE)
    clearLayoutParam()
  }

  return { pendingLayout, decodeError, dismiss }
}
