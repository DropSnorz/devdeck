import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PERMISSIONS,
  getPermissionWarnings,
  parseOctal,
  parseSymbolic,
  toChmodCommands,
  toOctal,
  toOctalPadded,
  toSymbolic,
  type Permissions,
} from './permissions'

const rwxrxrx: Permissions = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
  special: { setuid: false, setgid: false, sticky: false },
  fileType: '-',
}

describe('toOctal / toOctalPadded', () => {
  it('renders 3 digits when no special bits are set', () => {
    expect(toOctal(rwxrxrx)).toBe('755')
    expect(toOctalPadded(rwxrxrx)).toBe('0755')
  })

  it('prepends the special digit when any special bit is set', () => {
    const withSetuid: Permissions = { ...rwxrxrx, special: { setuid: true, setgid: false, sticky: false } }
    expect(toOctal(withSetuid)).toBe('4755')
    expect(toOctalPadded(withSetuid)).toBe('4755')
  })

  it('sums multiple special bits into the leading digit', () => {
    const all: Permissions = { ...rwxrxrx, special: { setuid: true, setgid: true, sticky: true } }
    expect(toOctal(all)).toBe('7755')
  })

  it('renders 000 for no permissions at all', () => {
    const none: Permissions = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
      special: { setuid: false, setgid: false, sticky: false },
      fileType: '-',
    }
    expect(toOctal(none)).toBe('000')
  })
})

describe('parseOctal', () => {
  it('parses a 3-digit octal string', () => {
    expect(parseOctal('755', '-')).toEqual(rwxrxrx)
  })

  it('parses a 4-digit octal string with special bits', () => {
    const result = parseOctal('4755', '-')
    expect(result?.special).toEqual({ setuid: true, setgid: false, sticky: false })
    expect(toOctal(result!)).toBe('4755')
  })

  it('carries over the given file type, which octal notation cannot encode', () => {
    expect(parseOctal('755', 'd')?.fileType).toBe('d')
  })

  it('rejects invalid input', () => {
    expect(parseOctal('abc', '-')).toBeNull()
    expect(parseOctal('888', '-')).toBeNull()
    expect(parseOctal('75', '-')).toBeNull()
    expect(parseOctal('75555', '-')).toBeNull()
    expect(parseOctal('', '-')).toBeNull()
  })

  it('round-trips with toOctal', () => {
    for (const octal of ['000', '644', '755', '777', '4755', '2755', '1755', '6755', '7777']) {
      expect(toOctal(parseOctal(octal, '-')!)).toBe(octal)
    }
  })
})

describe('toSymbolic', () => {
  it('renders the full ls -l style string', () => {
    expect(toSymbolic(rwxrxrx)).toBe('-rwxr-xr-x')
  })

  it('includes the file type character', () => {
    expect(toSymbolic({ ...rwxrxrx, fileType: 'd' })).toBe('drwxr-xr-x')
  })

  it('renders lowercase s for setuid/setgid when the execute bit is also set', () => {
    const withSetuid: Permissions = { ...rwxrxrx, special: { setuid: true, setgid: true, sticky: false } }
    expect(toSymbolic(withSetuid)).toBe('-rwsr-sr-x')
  })

  it('renders uppercase S when the special bit is set but execute is not', () => {
    const noOwnerExec: Permissions = {
      ...rwxrxrx,
      owner: { read: true, write: true, execute: false },
      special: { setuid: true, setgid: false, sticky: false },
    }
    expect(toSymbolic(noOwnerExec)).toBe('-rwSr-xr-x')
  })

  it('renders t/T for the sticky bit on the other triad', () => {
    const sticky: Permissions = { ...rwxrxrx, fileType: 'd', special: { setuid: false, setgid: false, sticky: true } }
    expect(toSymbolic(sticky)).toBe('drwxr-xr-t')

    const stickyNoExec: Permissions = {
      ...sticky,
      other: { read: true, write: false, execute: false },
    }
    expect(toSymbolic(stickyNoExec)).toBe('drwxr-xr-T')
  })
})

describe('parseSymbolic', () => {
  it('parses a full 10-character string with a file-type prefix', () => {
    expect(parseSymbolic('-rwxr-xr-x')).toEqual(rwxrxrx)
    expect(parseSymbolic('drwxr-xr-x')?.fileType).toBe('d')
  })

  it('parses a bare 9-character string, defaulting the file type to "-"', () => {
    expect(parseSymbolic('rwxr-xr-x')).toEqual(rwxrxrx)
  })

  it('round-trips setuid/setgid/sticky through lower and upper forms', () => {
    for (const symbolic of ['-rwsr-sr-t', '-rwSr-Sr-T', 'drwxrwxrwt']) {
      const parsed = parseSymbolic(symbolic)
      expect(parsed).not.toBeNull()
      expect(toSymbolic(parsed!)).toBe(symbolic)
    }
  })

  it('rejects malformed input', () => {
    expect(parseSymbolic('rwxr-xr')).toBeNull()
    expect(parseSymbolic('xyzr-xr-x')).toBeNull()
    expect(parseSymbolic('')).toBeNull()
  })
})

describe('toChmodCommands', () => {
  it('produces both a numeric and symbolic-assignment form', () => {
    const commands = toChmodCommands(rwxrxrx, 'script.sh')
    expect(commands.numeric).toBe('chmod 755 script.sh')
    expect(commands.symbolic).toBe('chmod u=rwx,g=rx,o=rx script.sh')
  })

  it('folds special bits into their conventional clause', () => {
    const withSpecial: Permissions = {
      ...rwxrxrx,
      fileType: 'd',
      special: { setuid: false, setgid: true, sticky: true },
    }
    const commands = toChmodCommands(withSpecial, 'shared')
    expect(commands.numeric).toBe('chmod 3755 shared')
    expect(commands.symbolic).toBe('chmod u=rwx,g=rxs,o=rxt shared')
  })
})

describe('getPermissionWarnings', () => {
  it('is empty for an unremarkable permission set', () => {
    expect(getPermissionWarnings(rwxrxrx)).toEqual([])
  })

  it('flags setuid combined with world-writable as a danger', () => {
    const risky: Permissions = {
      ...rwxrxrx,
      other: { read: true, write: true, execute: true },
      special: { setuid: true, setgid: false, sticky: false },
    }
    const warnings = getPermissionWarnings(risky)
    expect(warnings[0].level).toBe('danger')
    expect(warnings[0].message).toMatch(/setuid/i)
  })

  it('flags a world-writable file as a warning', () => {
    const worldWritable: Permissions = { ...rwxrxrx, other: { read: true, write: true, execute: true } }
    const warnings = getPermissionWarnings(worldWritable)
    expect(warnings).toContainEqual({
      level: 'warning',
      message: 'World-writable: any user on the system can modify this file.',
    })
  })

  it('flags a world-writable directory missing the sticky bit', () => {
    const dir: Permissions = { ...rwxrxrx, fileType: 'd', other: { read: true, write: true, execute: true } }
    const warnings = getPermissionWarnings(dir)
    expect(warnings.some((w) => /sticky bit/.test(w.message))).toBe(true)
  })

  it('does not flag the same directory once the sticky bit is set', () => {
    const dir: Permissions = {
      ...rwxrxrx,
      fileType: 'd',
      other: { read: true, write: true, execute: true },
      special: { setuid: false, setgid: false, sticky: true },
    }
    const warnings = getPermissionWarnings(dir)
    expect(warnings.some((w) => /without the sticky bit/.test(w.message))).toBe(false)
  })

  it('flags all-zero permissions', () => {
    const none: Permissions = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
      special: { setuid: false, setgid: false, sticky: false },
      fileType: '-',
    }
    expect(getPermissionWarnings(none)).toContainEqual({
      level: 'warning',
      message: 'No permissions at all: not even the owner can read, write, or execute this.',
    })
  })

  it('notes that setuid is inert on a directory', () => {
    const dir: Permissions = { ...rwxrxrx, fileType: 'd', special: { setuid: true, setgid: false, sticky: false } }
    expect(getPermissionWarnings(dir).some((w) => /setuid has no effect on a directory/i.test(w.message))).toBe(true)
  })

  it('notes that setgid on a directory enables group inheritance', () => {
    const dir: Permissions = { ...rwxrxrx, fileType: 'd', special: { setuid: false, setgid: true, sticky: false } }
    expect(getPermissionWarnings(dir).some((w) => /inherit this group/i.test(w.message))).toBe(true)
  })

  it('notes that the sticky bit has no effect on a plain file', () => {
    const file: Permissions = { ...rwxrxrx, special: { setuid: false, setgid: false, sticky: true } }
    expect(getPermissionWarnings(file).some((w) => /sticky bit only affects directories/i.test(w.message))).toBe(true)
  })

  it('notes that symlink permissions are ignored', () => {
    const link: Permissions = { ...rwxrxrx, fileType: 'l' }
    expect(getPermissionWarnings(link)[0]).toEqual({
      level: 'info',
      message: "Permissions on a symlink are ignored on Linux; the link target's own permissions apply instead.",
    })
  })

  it('is empty for the widget default permissions', () => {
    expect(getPermissionWarnings(DEFAULT_PERMISSIONS)).toEqual([])
  })
})
