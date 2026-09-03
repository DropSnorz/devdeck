export interface PermissionTriad {
  read: boolean
  write: boolean
  execute: boolean
}

export interface SpecialBits {
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export type FileType = '-' | 'd' | 'l'

export interface Permissions {
  owner: PermissionTriad
  group: PermissionTriad
  other: PermissionTriad
  special: SpecialBits
  fileType: FileType
}

export const DEFAULT_PERMISSIONS: Permissions = {
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  other: { read: true, write: false, execute: false },
  special: { setuid: false, setgid: false, sticky: false },
  fileType: '-',
}

const TRIAD_ORDER = ['owner', 'group', 'other'] as const

function triadToOctalDigit(triad: PermissionTriad): number {
  return (triad.read ? 4 : 0) + (triad.write ? 2 : 0) + (triad.execute ? 1 : 0)
}

function octalDigitToTriad(digit: number): PermissionTriad {
  return { read: (digit & 4) !== 0, write: (digit & 2) !== 0, execute: (digit & 1) !== 0 }
}

/** The leading special-bits octal digit: setuid=4, setgid=2, sticky=1. */
function specialToOctalDigit(special: SpecialBits): number {
  return (special.setuid ? 4 : 0) + (special.setgid ? 2 : 0) + (special.sticky ? 1 : 0)
}

function octalDigitToSpecial(digit: number): SpecialBits {
  return { setuid: (digit & 4) !== 0, setgid: (digit & 2) !== 0, sticky: (digit & 1) !== 0 }
}

/** Numeric (octal) form of `permissions`: 3 digits when no special bits are
 * set (the common case, e.g. "755"), 4 digits when any are (e.g. "4755") so
 * the leading digit is never a misleading "0" a reader might mistake for
 * "no special bits explicitly checked". */
export function toOctal(permissions: Permissions): string {
  const digits = TRIAD_ORDER.map((who) => triadToOctalDigit(permissions[who])).join('')
  const specialDigit = specialToOctalDigit(permissions.special)
  return specialDigit === 0 ? digits : `${specialDigit}${digits}`
}

/** Always-4-digit octal form (e.g. "0755"), for contexts that want a fixed
 * width regardless of whether special bits are set. */
export function toOctalPadded(permissions: Permissions): string {
  const digits = TRIAD_ORDER.map((who) => triadToOctalDigit(permissions[who])).join('')
  return `${specialToOctalDigit(permissions.special)}${digits}`
}

/** Parses a 3- or 4-digit octal permission string (each digit 0-7). Returns
 * `null` for anything else rather than throwing, since the widget
 * recomputes on every keystroke. `fileType` is carried over from the
 * current state since octal notation doesn't encode it. */
export function parseOctal(input: string, fileType: FileType): Permissions | null {
  const trimmed = input.trim()
  if (!/^[0-7]{3,4}$/.test(trimmed)) return null

  const digits = trimmed.length === 4 ? trimmed : `0${trimmed}`
  const [specialDigit, ownerDigit, groupDigit, otherDigit] = digits.split('').map(Number)

  return {
    owner: octalDigitToTriad(ownerDigit),
    group: octalDigitToTriad(groupDigit),
    other: octalDigitToTriad(otherDigit),
    special: octalDigitToSpecial(specialDigit),
    fileType,
  }
}

/** Renders one triad's `rwx` letters, substituting the special-bit letter
 * for the execute position when `specialFlag` is set: lowercase (s/t) when
 * execute is also set, uppercase (S/T) when the special bit is set but the
 * underlying execute bit is not (matching `ls -l`'s convention for
 * signaling that the special bit is otherwise inert). */
function triadToSymbolic(triad: PermissionTriad, specialFlag: boolean, lower: string, upper: string): string {
  const read = triad.read ? 'r' : '-'
  const write = triad.write ? 'w' : '-'
  const execute = specialFlag ? (triad.execute ? lower : upper) : triad.execute ? 'x' : '-'
  return `${read}${write}${execute}`
}

/** Full `ls -l`-style symbolic notation, e.g. "drwxr-xr-x" or "-rwsr-xr-x"
 * for a setuid file. Includes the leading file-type character. */
export function toSymbolic(permissions: Permissions): string {
  const owner = triadToSymbolic(permissions.owner, permissions.special.setuid, 's', 'S')
  const group = triadToSymbolic(permissions.group, permissions.special.setgid, 's', 'S')
  const other = triadToSymbolic(permissions.other, permissions.special.sticky, 't', 'T')
  return `${permissions.fileType}${owner}${group}${other}`
}

const SYMBOLIC_RE = /^([-dl]?)([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/

/** Parses `ls -l`-style symbolic notation, with or without the leading
 * file-type character (so both "drwxr-xr-x" and "rwxr-xr-x" are accepted).
 * Returns `null` for anything that doesn't match the 9-10 character
 * pattern. */
export function parseSymbolic(input: string): Permissions | null {
  const trimmed = input.trim()
  const match = SYMBOLIC_RE.exec(trimmed.length === 9 ? `-${trimmed}` : trimmed)
  if (!match) return null

  const [, type, or, ow, ox, gr, gw, gx, otr, otw, otx] = match
  if (!'-dl'.includes(type)) return null

  const setuid = ox === 's' || ox === 'S'
  const setgid = gx === 's' || gx === 'S'
  const sticky = otx === 't' || otx === 'T'

  return {
    owner: { read: or === 'r', write: ow === 'w', execute: ox === 'x' || ox === 's' },
    group: { read: gr === 'r', write: gw === 'w', execute: gx === 'x' || gx === 's' },
    other: { read: otr === 'r', write: otw === 'w', execute: otx === 'x' || otx === 't' },
    special: { setuid, setgid, sticky },
    fileType: type as FileType,
  }
}

function triadToSymbolicAssignment(triad: PermissionTriad): string {
  return `${triad.read ? 'r' : ''}${triad.write ? 'w' : ''}${triad.execute ? 'x' : ''}`
}

/** Quotes `value` as a single literal shell argument (POSIX single-quoting,
 * escaping any embedded `'`), so a target like `report; rm -rf ~` renders
 * as an inert string instead of a second command a reader could
 * accidentally run by pasting the generated command. */
function quoteShellArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** `chmod` invocations that reproduce `permissions`: the numeric form
 * (always unambiguous) and the equivalent `u=/g=/o=` symbolic assignment
 * form, with special-bit letters folded into their conventional clause
 * (setuid into `u=`, setgid into `g=`, sticky into `o=`). `target` is
 * shell-quoted and preceded by `--` so it's always treated as a literal
 * operand, never as a flag or a second command. */
export function toChmodCommands(permissions: Permissions, target = 'file'): { numeric: string; symbolic: string } {
  const owner = triadToSymbolicAssignment(permissions.owner) + (permissions.special.setuid ? 's' : '')
  const group = triadToSymbolicAssignment(permissions.group) + (permissions.special.setgid ? 's' : '')
  const other = triadToSymbolicAssignment(permissions.other) + (permissions.special.sticky ? 't' : '')
  const quotedTarget = quoteShellArg(target)

  return {
    numeric: `chmod ${toOctal(permissions)} -- ${quotedTarget}`,
    symbolic: `chmod u=${owner},g=${group},o=${other} -- ${quotedTarget}`,
  }
}

export type WarningLevel = 'danger' | 'warning' | 'info'

export interface PermissionWarning {
  level: WarningLevel
  message: string
}

/** Human-readable name for `fileType`, used in warning copy. */
function fileTypeNoun(fileType: FileType): string {
  return fileType === 'd' ? 'directory' : fileType === 'l' ? 'symlink' : 'file'
}

/** Whether `permissions` grants execute to any of the three classes.
 * Determines whether a setuid/setgid bit has any real effect: the file can
 * be run (and so the special bit takes hold) as soon as *any* class can
 * execute it, regardless of which class's own execute bit backs the s/S
 * glyph shown in symbolic notation. */
function isExecutableByAnyone({ owner, group, other }: Permissions): boolean {
  return owner.execute || group.execute || other.execute
}

/** Flags the security-relevant and easy-to-misread combinations in
 * `permissions` - world-writable content, special bits that are inert for
 * this file type, and directories missing the sticky bit they'd usually
 * want - ordered most severe first. Returns an empty array for an
 * unremarkable, everyday permission set.
 *
 * Symlink permissions are ignored on Linux wholesale (the kernel checks
 * the link target's mode, not the link's own), so a symlink short-circuits
 * to a single explanatory note rather than running the rest of this
 * file/directory-oriented analysis against bits that don't actually apply. */
export function getPermissionWarnings(permissions: Permissions): PermissionWarning[] {
  if (permissions.fileType === 'l') {
    return [
      {
        level: 'info',
        message: "Permissions on a symlink are ignored on Linux; the link target's own permissions apply instead.",
      },
    ]
  }

  const { owner, group, other, special, fileType } = permissions
  const warnings: PermissionWarning[] = []
  const noun = fileTypeNoun(fileType)
  const executable = isExecutableByAnyone(permissions)

  if (fileType === '-' && other.write && special.setuid && executable) {
    warnings.push({
      level: 'danger',
      message:
        "Setuid combined with world-writable is a severe risk: anyone can replace this file and have it run with the owner's privileges.",
    })
  } else if (other.write && fileType !== 'd') {
    warnings.push({ level: 'warning', message: `World-writable: any user on the system can modify this ${noun}.` })
  }

  if (fileType === 'd' && other.write && !special.sticky) {
    warnings.push({
      level: 'warning',
      message:
        'World-writable directory without the sticky bit: any user can delete or rename files owned by others in it, not just their own.',
    })
  }

  if (
    !owner.read &&
    !owner.write &&
    !owner.execute &&
    !group.read &&
    !group.write &&
    !group.execute &&
    !other.read &&
    !other.write &&
    !other.execute
  ) {
    warnings.push({
      level: 'warning',
      message: 'No permissions at all: not even the owner can read, write, or execute this.',
    })
  } else if (!owner.read && (owner.write || owner.execute)) {
    warnings.push({
      level: 'info',
      message: 'Owner can write and/or execute without read access, an unusual combination.',
    })
  }

  if (special.setuid) {
    if (fileType === 'd') {
      warnings.push({ level: 'info', message: 'Setuid has no effect on a directory (Linux ignores it there).' })
    } else if (!executable) {
      warnings.push({
        level: 'info',
        message:
          'Setuid is set but nothing can execute this file (no execute bit is set for owner, group, or other), so it has no effect.',
      })
    } else {
      warnings.push({
        level: 'info',
        message: "Setuid: runs with the owner's identity, not the identity of whoever executes it.",
      })
    }
  }

  if (special.setgid) {
    if (fileType === 'd') {
      warnings.push({
        level: 'info',
        message:
          'Setgid on a directory: new files and subdirectories created inside inherit this group, useful for shared team directories.',
      })
    } else if (!executable) {
      warnings.push({
        level: 'info',
        message:
          'Setgid is set but nothing can execute this file (no execute bit is set for owner, group, or other), so it has no effect.',
      })
    } else {
      warnings.push({
        level: 'info',
        message: "Setgid: runs with the file's group identity, not the primary group of whoever executes it.",
      })
    }
  }

  if (special.sticky) {
    if (fileType !== 'd') {
      warnings.push({ level: 'info', message: 'Sticky bit only affects directories; it has no effect on a file.' })
    } else {
      warnings.push({
        level: 'info',
        message: 'Sticky bit: only the owner (or root) can delete or rename entries inside this directory, like /tmp.',
      })
    }
  }

  if (other.execute && !other.read && fileType === '-') {
    warnings.push({
      level: 'info',
      message: 'Execute without read for "other": the file can be run but not opened/inspected.',
    })
  }

  return warnings
}

export const PERMISSION_PRESETS: { octal: string; label: string; description: string }[] = [
  { octal: '755', label: '755', description: 'rwxr-xr-x (owner full, everyone else read/execute)' },
  { octal: '644', label: '644', description: 'rw-r--r-- (owner read/write, everyone else read-only)' },
  { octal: '700', label: '700', description: 'rwx------ (owner only)' },
  { octal: '600', label: '600', description: 'rw------- (owner read/write only, common for secrets/keys)' },
  { octal: '777', label: '777', description: 'rwxrwxrwx (everyone can read, write, and execute)' },
  { octal: '664', label: '664', description: 'rw-rw-r-- (owner and group can write, others read-only)' },
  { octal: '750', label: '750', description: 'rwxr-x--- (owner full, group read/execute, others none)' },
  { octal: '1777', label: '1777', description: 'rwxrwxrwt (world-writable with the sticky bit, like /tmp)' },
]
