import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  v1 as uuidv1,
  v3 as uuidv3,
  v5 as uuidv5,
  v7 as uuidv7,
  validate as isValidUuid,
} from 'uuid'
import { SegmentedControl } from '@/components/SegmentedControl'
import { CopyButton } from '@/components/CopyButton'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import type { WidgetProps } from '@/widgets/types'

const MAX_HISTORY = 20

type Version = 'v1' | 'v3' | 'v4' | 'v5' | 'v7'

const VERSION_OPTIONS: { label: string; value: Version }[] = [
  { label: 'v1', value: 'v1' },
  { label: 'v3', value: 'v3' },
  { label: 'v4', value: 'v4' },
  { label: 'v5', value: 'v5' },
  { label: 'v7', value: 'v7' },
]

// v3/v5 UUIDs are deterministic hashes of a name within a namespace. These
// four are the namespaces predefined by RFC 4122 Appendix C — fixed,
// well-known values, not something the library needs to supply.
const NAMESPACE_PRESETS = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
} as const

type NamespacePreset = keyof typeof NAMESPACE_PRESETS | 'custom'

const NAMESPACE_OPTIONS: { label: string; value: NamespacePreset }[] = [
  { label: 'DNS', value: 'DNS' },
  { label: 'URL', value: 'URL' },
  { label: 'OID', value: 'OID' },
  { label: 'X.500', value: 'X500' },
  { label: 'Custom', value: 'custom' },
]

function isNameBased(version: Version): version is 'v3' | 'v5' {
  return version === 'v3' || version === 'v5'
}

function generateUuid(
  version: Version,
  name: string,
  namespace: string,
): string {
  switch (version) {
    case 'v1':
      return uuidv1()
    case 'v7':
      return uuidv7()
    case 'v3':
      return uuidv3(name, namespace)
    case 'v5':
      return uuidv5(name, namespace)
    case 'v4':
      // Native and already correct — no need for the library here.
      return crypto.randomUUID()
  }
}

export default function UuidGeneratorWidget({ instanceId }: WidgetProps) {
  const [version, setVersion] = useState<Version>('v4')
  const [uuids, setUuids] = useState<string[]>([])
  const [name, setName] = useState('')
  const [namespacePreset, setNamespacePreset] = useState<NamespacePreset>('DNS')
  const [customNamespace, setCustomNamespace] = useState('')

  useWidgetDirty(instanceId, uuids.length > 0 || name.length > 0)

  const nameBased = isNameBased(version)
  const namespace =
    namespacePreset === 'custom'
      ? customNamespace
      : NAMESPACE_PRESETS[namespacePreset]
  const namespaceValid = !nameBased || isValidUuid(namespace)
  const canGenerate = !nameBased || (namespaceValid && name.trim().length > 0)

  const handleGenerate = () => {
    if (!canGenerate) return
    const uuid = generateUuid(version, name, namespace)
    setUuids((prev) => [uuid, ...prev].slice(0, MAX_HISTORY))
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <SegmentedControl
        value={version}
        onChange={setVersion}
        options={VERSION_OPTIONS}
      />

      {nameBased && (
        <div className="flex flex-col gap-1.5 text-xs">
          <SegmentedControl
            value={namespacePreset}
            onChange={setNamespacePreset}
            options={NAMESPACE_OPTIONS}
            className="flex-wrap"
          />
          {namespacePreset === 'custom' && (
            <input
              value={customNamespace}
              onChange={(event) => setCustomNamespace(event.target.value)}
              placeholder="Namespace UUID…"
              spellCheck={false}
              className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
            />
          )}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name to hash…"
            spellCheck={false}
            className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1 font-mono focus:border-slate-500 focus:outline-none dark:border-slate-700"
          />
          {!namespaceValid && (
            <p className="text-red-600 dark:text-red-400">
              Namespace must be a valid UUID
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        <RefreshCw className="size-3.5" />
        Generate
      </button>
      {uuids.length === 0 ? (
        <p className="min-h-16 flex-1 text-xs text-slate-400">
          Generated UUIDs will appear here.
        </p>
      ) : (
        // A guaranteed minimum height rather than min-h-0: with the v3/v5
        // controls above it, this list can otherwise get squeezed to 0px on
        // a small card — a 0-height element shows no usable scrollbar at
        // all, silently making already-generated UUIDs unreachable.
        <ul className="min-h-16 flex-1 space-y-1 overflow-auto">
          {uuids.map((uuid, index) => (
            <li
              key={`${uuid}-${index}`}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 font-mono text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="truncate">{uuid}</span>
              <CopyButton value={uuid} label="" className="shrink-0 px-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
