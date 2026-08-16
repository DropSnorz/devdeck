import { useId } from 'react'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { NumberField } from '@/components/NumberField'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Input } from '@/components/ui/input'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { calculateSubnet, splitCidrNotation } from './subnetCalculator'

const DEFAULT_ADDRESS = '192.168.1.0'
const DEFAULT_PREFIX = 24

export default function SubnetCalculatorWidget({ instanceId }: WidgetProps) {
  const [address, setAddress] = useWidgetState(instanceId, 'address', DEFAULT_ADDRESS)
  const [prefix, setPrefix] = useWidgetState(instanceId, 'prefix', DEFAULT_PREFIX)
  useWidgetDirty(instanceId, address !== DEFAULT_ADDRESS || prefix !== DEFAULT_PREFIX)
  const addressId = useId()

  // Lets "192.168.1.0/24" be pasted straight into the address field instead
  // of requiring the prefix to be set separately.
  const handleAddressChange = (value: string) => {
    const split = splitCidrNotation(value)
    if (split) {
      setAddress(split.address)
      setPrefix(split.prefix)
    } else {
      setAddress(value)
    }
  }

  const result = calculateSubnet(address, prefix)
  const hasError = address.trim() !== '' && result === null

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-end gap-2">
        <Field label="IP address" htmlFor={addressId} className="flex-1">
          <Input
            id={addressId}
            value={address}
            onChange={(event) => handleAddressChange(event.target.value)}
            placeholder="192.168.1.0"
            spellCheck={false}
            className="font-mono"
          />
        </Field>
        <NumberField label="Prefix" value={prefix} min={0} max={32} onChange={setPrefix} />
      </div>
      {hasError && <ErrorMessage>Enter a valid IPv4 address</ErrorMessage>}

      <div className="min-h-16 flex-1 space-y-0.5 overflow-auto">
        <ResultRow label="CIDR notation" value={result?.cidr ?? ''} />
        <ResultRow label="Network address" value={result?.networkAddress ?? ''} />
        <ResultRow label="Broadcast address" value={result?.broadcastAddress ?? ''} />
        <ResultRow label="Subnet mask" value={result?.subnetMask ?? ''} />
        <ResultRow label="Wildcard mask" value={result?.wildcardMask ?? ''} />
        <ResultRow label="First host" value={result?.firstHost ?? ''} />
        <ResultRow label="Last host" value={result?.lastHost ?? ''} />
        <ResultRow label="Usable hosts" value={result ? String(result.usableHosts) : ''} />
        <ResultRow label="Total addresses" value={result ? String(result.totalAddresses) : ''} />
        <ResultRow label="IP class" value={result?.ipClass ?? ''} />
        <ResultRow label="Address type" value={result?.addressType ?? ''} />
      </div>
    </div>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate font-mono">{value || '—'}</span>
        <CopyButton value={value} label="" className="shrink-0 px-1" />
      </div>
    </div>
  )
}
