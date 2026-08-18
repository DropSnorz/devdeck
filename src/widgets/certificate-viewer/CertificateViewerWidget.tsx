import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import {
  CertificateParseError,
  parseCertificatesFromInput,
  type ExtensionDetail,
  type ParsedCertificate,
  type PublicKeyInfo,
} from './certificate'

function formatPublicKey(key: PublicKeyInfo): string {
  switch (key.kind) {
    case 'rsa':
      return `RSA ${key.keySizeBits}-bit (exponent ${key.exponent})`
    case 'ec':
      return `EC ${key.curve} (${key.keySizeBits}-bit)`
    case 'eddsa':
      return `${key.algorithm} (${key.keySizeBits}-bit)`
    case 'dsa':
      return key.keySizeBits ? `DSA ${key.keySizeBits}-bit` : 'DSA'
    case 'unknown':
      return key.name
  }
}

/** Best-effort short label for a certificate's summary line: prefers the
 * subject's Common Name, falling back to the full subject string for
 * certificates (rare, but valid) that have none. */
function shortLabel(cert: ParsedCertificate): string {
  const cn = cert.subject.flat().find((attr) => attr.oid === '2.5.4.3')
  return cn?.value ?? cert.subjectString
}

function bufferToColonHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
}

export default function CertificateViewerWidget({ instanceId }: WidgetProps) {
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  useWidgetDirty(instanceId, input.length > 0)

  const { certificates, error } = useMemo(() => {
    if (!input.trim()) return { certificates: [] as ParsedCertificate[], error: null as string | null }
    try {
      return { certificates: parseCertificatesFromInput(input), error: null }
    } catch (err) {
      const message =
        err instanceof CertificateParseError || err instanceof Error ? err.message : 'Could not parse this certificate'
      return { certificates: [], error: message }
    }
  }, [input])

  return (
    <div className="flex h-full flex-col gap-2">
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste one or more PEM certificates (-----BEGIN CERTIFICATE-----)…"
        spellCheck={false}
        className="h-16 w-full resize-none p-2 font-mono text-xs"
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {certificates.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto text-xs">
          {certificates.map((cert, index) => (
            // Keyed on the cert's own DER bytes so pasting a different
            // certificate resets each card back to its default open/closed
            // state instead of preserving whatever the previous cert's
            // <details> happened to be at.
            <CertificateCard
              key={index}
              cert={cert}
              defaultOpen={index === 0}
              label={certificates.length > 1 ? `Certificate ${index + 1} of ${certificates.length}` : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CertificateCard({
  cert,
  defaultOpen,
  label,
}: {
  cert: ParsedCertificate
  defaultOpen: boolean
  label: string | null
}) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-border [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
        <div className="flex min-w-0 items-center gap-2">
          {label && <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>}
          <span className="truncate font-medium">{shortLabel(cert)}</span>
        </div>
        <ValidityBadge notBefore={cert.notBefore} notAfter={cert.notAfter} />
      </summary>
      <div className="flex flex-col gap-1 border-t border-border p-2">
        <DetailRow label="Subject" value={cert.subjectString} />
        <DetailRow label="Issuer" value={cert.issuerString} />
        <DetailRow label="Serial number" value={cert.serialNumberHex} />
        <DetailRow label="Version" value={`v${cert.version}`} mono={false} />
        <DetailRow label="Not before" value={cert.notBefore.toUTCString()} mono={false} />
        <DetailRow label="Not after" value={cert.notAfter.toUTCString()} mono={false} />
        <DetailRow label="Signature algorithm" value={cert.signatureAlgorithmName} />
        <DetailRow label="Public key" value={formatPublicKey(cert.publicKey)} mono={false} />
        <Fingerprints der={cert.der} />
        {cert.extensions.map((ext) => (
          <ExtensionRow key={ext.oid} extension={ext} />
        ))}
      </div>
    </details>
  )
}

function DetailRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded px-1 py-1 hover:bg-accent">
      <span className="shrink-0 pt-0.5 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-start gap-1">
        <span className={cn('min-w-0 text-right break-all', mono && 'font-mono')}>{value || '—'}</span>
        <CopyButton value={value} label="" className="shrink-0 px-1" />
      </div>
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px]">
          {item}
        </span>
      ))}
    </div>
  )
}

/** Renders the SHA-256/SHA-1 fingerprints of the whole DER-encoded
 * certificate. Computed asynchronously via WebCrypto (same pattern as
 * HashGeneratorWidget) rather than a bundled hash implementation. */
function Fingerprints({ der }: { der: Uint8Array }) {
  // Keyed on `der` below, alongside the value itself, so a stale result
  // from a since-replaced certificate is never displayed — a plain
  // `useState(null)` would need a synchronous reset in the effect body to
  // get the same guarantee, which cascades an extra render for no benefit
  // here (the digest resolves within a tick either way).
  const [fingerprints, setFingerprints] = useState<{ der: Uint8Array; sha256: string; sha1: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const bytes = new Uint8Array(der)
    Promise.all([crypto.subtle.digest('SHA-256', bytes), crypto.subtle.digest('SHA-1', bytes)]).then(
      ([sha256, sha1]) => {
        if (!cancelled) setFingerprints({ der, sha256: bufferToColonHex(sha256), sha1: bufferToColonHex(sha1) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [der])

  const current = fingerprints?.der === der ? fingerprints : null

  return (
    <>
      <DetailRow label="SHA-256 fingerprint" value={current?.sha256 ?? ''} />
      <DetailRow label="SHA-1 fingerprint" value={current?.sha1 ?? ''} />
    </>
  )
}

function ExtensionRow({
  extension,
}: {
  extension: { oid: string; name: string; critical: boolean; detail: ExtensionDetail; rawHex: string }
}) {
  const label = (
    <span className="inline-flex items-center gap-1">
      {extension.name}
      {extension.critical && (
        <span className="rounded-full bg-destructive/10 px-1.5 py-0 text-[10px] text-destructive dark:bg-destructive/20">
          critical
        </span>
      )}
    </span>
  )

  switch (extension.detail.kind) {
    case 'basicConstraints':
      return (
        <DetailRow
          label="Basic constraints"
          mono={false}
          value={
            extension.detail.isCA
              ? `CA:TRUE${extension.detail.pathLenConstraint !== undefined ? `, path length ${extension.detail.pathLenConstraint}` : ''}`
              : 'CA:FALSE'
          }
        />
      )
    case 'keyUsage':
    case 'extKeyUsage':
      return (
        <div className="flex items-start justify-between gap-2 rounded px-1 py-1 hover:bg-accent">
          <span className="shrink-0 pt-0.5 text-muted-foreground">{label}</span>
          <ChipList items={extension.detail.usages} />
        </div>
      )
    case 'subjectAltName':
    case 'issuerAltName':
      return (
        <div className="flex items-start justify-between gap-2 rounded px-1 py-1 hover:bg-accent">
          <span className="shrink-0 pt-0.5 text-muted-foreground">{label}</span>
          <ChipList items={extension.detail.names.map((n) => `${n.type}: ${n.value}`)} />
        </div>
      )
    case 'keyIdentifier':
      return <DetailRow label={extension.name} value={extension.detail.keyId} />
    case 'authorityInfoAccess':
      return (
        <div className="flex items-start justify-between gap-2 rounded px-1 py-1 hover:bg-accent">
          <span className="shrink-0 pt-0.5 text-muted-foreground">{label}</span>
          <ChipList items={extension.detail.entries.map((e) => `${e.method}: ${e.location}`)} />
        </div>
      )
    case 'raw':
      return (
        <div className="flex items-start justify-between gap-2 rounded px-1 py-1 hover:bg-accent">
          <span className="shrink-0 pt-0.5 text-muted-foreground">{label}</span>
          <div className="flex min-w-0 items-start gap-1">
            <span className="min-w-0 truncate text-right font-mono text-muted-foreground" title={extension.oid}>
              {extension.rawHex.length > 40 ? `${extension.rawHex.slice(0, 40)}…` : extension.rawHex || '(empty)'}
            </span>
            <CopyButton value={extension.rawHex} label="" className="shrink-0 px-1" />
          </div>
        </div>
      )
  }
}

/** "Now" is captured once via a lazy useState initializer rather than an
 * effect, matching JwtDecoderWidget's ExpiryBadge — each card is keyed on
 * its own certificate so a freshly pasted cert gets a freshly captured
 * "now" instead of reusing a stale one from a previous render. */
function ValidityBadge({ notBefore, notAfter }: { notBefore: Date; notAfter: Date }) {
  const [now] = useState(() => Date.now())

  if (now < notBefore.getTime()) {
    return <Badge tone="muted">Not yet valid</Badge>
  }
  if (now > notAfter.getTime()) {
    return <Badge tone="destructive">Expired</Badge>
  }
  return <Badge tone="success">Valid</Badge>
}

function Badge({ tone, children }: { tone: 'success' | 'destructive' | 'muted'; children: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'success' && 'bg-success/15 text-success dark:bg-success/20',
        tone === 'destructive' && 'bg-destructive/10 text-destructive dark:bg-destructive/20',
        tone === 'muted' && 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}
