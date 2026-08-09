import { useMemo, useState } from 'react'
import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { useIsDarkTheme } from '@/theme/useThemeStore'
import { cn } from '@/lib/cn'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const binary = atob(normalized + '='.repeat(padLength))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

interface DecodedJwt {
  header: unknown
  payload: Record<string, unknown>
}

function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.')
  if (parts.length !== 3) {
    throw new Error('A JWT has 3 dot-separated parts: header.payload.signature')
  }
  const [headerPart, payloadPart] = parts
  return {
    header: JSON.parse(base64UrlDecode(headerPart)) as unknown,
    payload: JSON.parse(base64UrlDecode(payloadPart)) as Record<
      string,
      unknown
    >,
  }
}

export default function JwtDecoderWidget({ instanceId }: WidgetProps) {
  const [token, setToken] = useWidgetState(instanceId, 'token', '')
  const isDark = useIsDarkTheme()
  useWidgetDirty(instanceId, token.length > 0)

  const { decoded, error } = useMemo(() => {
    if (!token.trim()) return { decoded: null, error: null as string | null }
    try {
      return { decoded: decodeJwt(token), error: null }
    } catch (err) {
      return {
        decoded: null,
        error: err instanceof Error ? err.message : 'Invalid token',
      }
    }
  }, [token])

  const style = isDark ? darkStyles : defaultStyles

  return (
    <div className="flex h-full flex-col gap-2">
      <textarea
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="Paste a JWT…"
        spellCheck={false}
        className="h-16 w-full resize-none rounded-md border border-slate-300 bg-transparent p-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-700"
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {decoded && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto text-xs">
          {/* Keyed on the token so a freshly-decoded JWT gets a freshly
           * captured "now" — see ExpiryBadge for why this avoids an effect. */}
          <ExpiryBadge key={token} payload={decoded.payload} />
          <div>
            <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">
              Header
            </p>
            {typeof decoded.header === 'object' && decoded.header !== null ? (
              <JsonView data={decoded.header} style={style} />
            ) : (
              <pre className="font-mono text-xs">
                {JSON.stringify(decoded.header)}
              </pre>
            )}
          </div>
          <div>
            <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">
              Payload
            </p>
            <JsonView data={decoded.payload} style={style} />
          </div>
          <p className="text-[11px] text-slate-400">Signature not verified.</p>
        </div>
      )}
    </div>
  )
}

/** Renders the exp-based valid/expired badge. "Now" is captured once via a
 * useState lazy initializer (React's sanctioned way to read an impure value
 * exactly once per mount) rather than in an effect; the parent remounts this
 * component by `key={token}` whenever a new JWT is decoded, so the captured
 * time stays pinned to when this token was pasted, not the badge's own
 * re-renders. */
function ExpiryBadge({ payload }: { payload: Record<string, unknown> }) {
  const [now] = useState(() => Date.now())
  const exp = payload.exp
  if (typeof exp !== 'number') return null

  const date = new Date(exp * 1000)
  const expired = date.getTime() < now

  return (
    <span
      className={cn(
        'w-fit rounded-full px-2 py-0.5 font-medium',
        expired
          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
          : 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300',
      )}
    >
      {expired ? 'Expired' : 'Valid until'} {date.toLocaleString()}
    </span>
  )
}
