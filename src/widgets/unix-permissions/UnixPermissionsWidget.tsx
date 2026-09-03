import { Fragment, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Info, OctagonAlert, Terminal } from 'lucide-react'
import { CopyButton } from '@/components/CopyButton'
import { Field } from '@/components/Field'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_PRESETS,
  getPermissionWarnings,
  parseOctal,
  parseSymbolic,
  toChmodCommands,
  toOctal,
  toOctalPadded,
  toSymbolic,
  type FileType,
  type PermissionTriad,
  type Permissions,
  type WarningLevel,
} from './permissions'

const DEFAULT_TARGET = 'file'

const WHO: { key: 'owner' | 'group' | 'other'; label: string }[] = [
  { key: 'owner', label: 'Owner' },
  { key: 'group', label: 'Group' },
  { key: 'other', label: 'Other' },
]

const BITS: { key: keyof PermissionTriad; label: string; letter: string }[] = [
  { key: 'read', label: 'Read', letter: 'r' },
  { key: 'write', label: 'Write', letter: 'w' },
  { key: 'execute', label: 'Execute', letter: 'x' },
]

const SPECIAL_COLUMNS: { key: 'setuid' | 'setgid' | 'sticky'; letter: string; title: string }[] = [
  { key: 'setuid', letter: 's', title: 'Setuid' },
  { key: 'setgid', letter: 's', title: 'Setgid' },
  { key: 'sticky', letter: 't', title: 'Sticky bit' },
]

const FILE_TYPE_OPTIONS: { label: string; value: FileType }[] = [
  { label: 'File', value: '-' },
  { label: 'Directory', value: 'd' },
  { label: 'Symlink', value: 'l' },
]

const WARNING_STYLES: Record<WarningLevel, { row: string; icon: typeof Info }> = {
  danger: { row: 'bg-destructive/10 text-destructive dark:bg-destructive/20', icon: OctagonAlert },
  warning: { row: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', icon: AlertTriangle },
  info: { row: 'bg-muted text-muted-foreground', icon: Info },
}

export default function UnixPermissionsWidget({ instanceId }: WidgetProps) {
  const [permissions, setPermissions] = useWidgetState<Permissions>(instanceId, 'permissions', DEFAULT_PERMISSIONS)
  const [target, setTarget] = useWidgetState(instanceId, 'target', DEFAULT_TARGET)
  useWidgetDirty(
    instanceId,
    toOctalPadded(permissions) !== toOctalPadded(DEFAULT_PERMISSIONS) ||
      permissions.fileType !== DEFAULT_PERMISSIONS.fileType ||
      target !== DEFAULT_TARGET,
  )

  const targetId = useId()

  const toggleBit = (who: 'owner' | 'group' | 'other', bit: keyof PermissionTriad) => {
    setPermissions((prev) => ({ ...prev, [who]: { ...prev[who], [bit]: !prev[who][bit] } }))
  }

  const toggleSpecial = (bit: 'setuid' | 'setgid' | 'sticky') => {
    setPermissions((prev) => ({ ...prev, special: { ...prev.special, [bit]: !prev.special[bit] } }))
  }

  const setFileType = (fileType: FileType) => {
    setPermissions((prev) => ({ ...prev, fileType }))
  }

  const applyPreset = (octal: string) => {
    const parsed = parseOctal(octal, permissions.fileType)
    if (parsed) setPermissions(parsed)
  }

  const warnings = getPermissionWarnings(permissions)
  const commands = toChmodCommands(permissions, target.trim() || DEFAULT_TARGET)

  return (
    <div className="flex h-full flex-col gap-2.5 text-xs">
      <SegmentedControl value={permissions.fileType} onChange={setFileType} options={FILE_TYPE_OPTIONS} />

      <PermissionGrid permissions={permissions} onToggleBit={toggleBit} onToggleSpecial={toggleSpecial} />

      <div className="grid grid-cols-2 gap-1.5">
        <ValidatedField
          label="Octal"
          value={toOctal(permissions)}
          placeholder="755"
          parse={(raw) => parseOctal(raw, permissions.fileType)}
          onParsed={setPermissions}
          invalidMessage="3 or 4 digits, each 0-7"
        />
        <ValidatedField
          label="Symbolic"
          value={toSymbolic(permissions)}
          placeholder="rwxr-xr-x"
          parse={parseSymbolic}
          onParsed={setPermissions}
          invalidMessage="e.g. rwxr-xr-x"
        />
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-2">
        <div className="flex items-center gap-1.5">
          <Terminal className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Field label="on" htmlFor={targetId} layout="row" className="min-w-0 flex-1">
            <Input
              id={targetId}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder={DEFAULT_TARGET}
              spellCheck={false}
              className="h-auto min-w-0 flex-1 py-0.5 font-mono"
            />
          </Field>
        </div>
        <CommandRow command={commands.numeric} />
        <CommandRow command={commands.symbolic} />
      </div>

      <div className="flex flex-wrap gap-1">
        {PERMISSION_PRESETS.map((preset) => (
          <button
            key={preset.octal}
            type="button"
            onClick={() => applyPreset(preset.octal)}
            title={preset.description}
            aria-pressed={toOctal(permissions) === preset.octal}
            className={cn(
              'rounded px-1.5 py-1 font-mono font-medium transition-colors',
              toOctal(permissions) === preset.octal
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-auto">
        {warnings.length === 0 ? (
          <p className="rounded px-1.5 py-1 text-muted-foreground">Nothing unusual about this permission set.</p>
        ) : (
          warnings.map((warning, index) => {
            const style = WARNING_STYLES[warning.level]
            const WarningIcon = style.icon
            return (
              <div key={index} className={cn('flex items-start gap-1.5 rounded px-1.5 py-1', style.row)}>
                <WarningIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">
                    {warning.level === 'danger' ? 'Danger: ' : warning.level === 'warning' ? 'Warning: ' : 'Info: '}
                  </span>
                  {warning.message}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function PermissionGrid({
  permissions,
  onToggleBit,
  onToggleSpecial,
}: {
  permissions: Permissions
  onToggleBit: (who: 'owner' | 'group' | 'other', bit: keyof PermissionTriad) => void
  onToggleSpecial: (bit: 'setuid' | 'setgid' | 'sticky') => void
}) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr] items-center gap-1">
      <span />
      {WHO.map(({ key, label }) => (
        <span key={key} className="text-center font-medium text-muted-foreground">
          {label}
        </span>
      ))}

      {BITS.map(({ key, label, letter }) => (
        <Fragment key={key}>
          <span className="text-muted-foreground">{label}</span>
          {WHO.map(({ key: who }) => (
            <BitToggle
              key={`${who}-${key}`}
              active={permissions[who][key]}
              letter={letter}
              ariaLabel={`${WHO.find((w) => w.key === who)?.label} ${label.toLowerCase()}`}
              onToggle={() => onToggleBit(who, key)}
            />
          ))}
        </Fragment>
      ))}

      <span className="text-muted-foreground">Special</span>
      {SPECIAL_COLUMNS.map(({ key, letter, title }) => (
        <BitToggle
          key={key}
          active={permissions.special[key]}
          letter={letter}
          ariaLabel={title}
          title={title}
          onToggle={() => onToggleSpecial(key)}
        />
      ))}
    </div>
  )
}

function BitToggle({
  active,
  letter,
  ariaLabel,
  title,
  onToggle,
}: {
  active: boolean
  letter: string
  ariaLabel: string
  title?: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'flex h-7 w-full items-center justify-center rounded font-mono font-semibold transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
      )}
    >
      {letter}
    </button>
  )
}

/** A text input showing `value` (a canonical string derived from the
 * current permissions) that also accepts direct edits: typed text is
 * parsed on every keystroke and, once valid, immediately propagated via
 * `onParsed`. Mirrors NumberField's local-buffer pattern, replacing a
 * min/max clamp with `parse`/`invalidMessage` so it works for octal and
 * symbolic notation alike. The buffer only resyncs from `value` while the
 * field isn't focused, so an in-progress edit (including a temporarily
 * invalid one) is never overwritten mid-keystroke. */
function ValidatedField({
  label,
  value,
  placeholder,
  parse,
  onParsed,
  invalidMessage,
}: {
  label: string
  value: string
  placeholder: string
  parse: (raw: string) => Permissions | null
  onParsed: (permissions: Permissions) => void
  invalidMessage: string
}) {
  const id = useId()
  const [text, setText] = useState(value)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(value)
  }, [value])

  const invalid = text.trim() !== '' && parse(text) === null

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    setText(raw)
    const parsed = parse(raw)
    if (parsed) onParsed(parsed)
  }

  return (
    <Field label={label} htmlFor={id} error={invalid ? invalidMessage : null}>
      <div className="relative">
        <Input
          id={id}
          value={text}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
            setText(value)
          }}
          onChange={handleChange}
          placeholder={placeholder}
          spellCheck={false}
          className={cn('pr-8 font-mono text-sm font-semibold', invalid && 'border-destructive')}
        />
        <CopyButton
          value={value}
          label=""
          ariaLabel={`Copy ${label.toLowerCase()}`}
          className="absolute right-0.5 top-0.5 px-1.5"
        />
      </div>
    </Field>
  )
}

function CommandRow({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-1">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded bg-background px-1.5 py-1 font-mono text-[11px] dark:bg-muted/40">
        {command}
      </pre>
      <CopyButton value={command} label="" ariaLabel="Copy command" className="shrink-0 px-1.5" />
    </div>
  )
}
