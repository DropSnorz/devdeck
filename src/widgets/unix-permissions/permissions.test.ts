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

  it('rejects t/T (the sticky-bit letters) in the owner or group execute position', () => {
    // t/T is only meaningful in the "other" slot (sticky bit); a lenient
    // regex previously accepted it for owner/group too and silently
    // reinterpreted it instead of rejecting the input.
    expect(parseSymbolic('-rwt------')).toBeNull()
    expect(parseSymbolic('-rwT------')).toBeNull()
    expect(parseSymbolic('-rwxr-t---')).toBeNull()
    expect(parseSymbolic('-rwxr-T---')).toBeNull()
  })
})

describe('toChmodCommands', () => {
  it('produces both a numeric and symbolic-assignment form, with the target shell-quoted', () => {
    const commands = toChmodCommands(rwxrxrx, 'script.sh')
    expect(commands.numeric).toBe("chmod 755 -- 'script.sh'")
    expect(commands.symbolic).toBe("chmod u=rwx,g=rx,o=rx -- 'script.sh'")
  })

  it('folds special bits into their conventional clause', () => {
    const withSpecial: Permissions = {
      ...rwxrxrx,
      fileType: 'd',
      special: { setuid: false, setgid: true, sticky: true },
    }
    const commands = toChmodCommands(withSpecial, 'shared')
    expect(commands.numeric).toBe("chmod 3755 -- 'shared'")
    expect(commands.symbolic).toBe("chmod u=rwx,g=rxs,o=rxt -- 'shared'")
  })

  it('quotes a target that would otherwise look like a second shell command', () => {
    // The widget never executes this string itself, but it's rendered as a
    // copy-pasteable command, so an untrusted/pasted target must not be
    // able to inject a second command via unescaped shell metacharacters.
    const commands = toChmodCommands(rwxrxrx, 'report; rm -rf ~')
    expect(commands.numeric).toBe("chmod 755 -- 'report; rm -rf ~'")
  })

  it('escapes an embedded single quote in the target', () => {
    const commands = toChmodCommands(rwxrxrx, "it's a file")
    expect(commands.numeric).toBe(`chmod 755 -- 'it'\\''s a file'`)
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

  it('does not flag the setuid + world-writable danger for a directory', () => {
    // Setuid has no effect on a directory at all (Linux ignores it), so
    // combining it with world-writable isn't the "replace the file and
    // have it run as the owner" risk the danger message describes.
    const dir: Permissions = {
      ...rwxrxrx,
      fileType: 'd',
      other: { read: true, write: true, execute: true },
      special: { setuid: true, setgid: false, sticky: false },
    }
    expect(getPermissionWarnings(dir).some((w) => w.level === 'danger')).toBe(false)
  })

  it('does not flag the setuid + world-writable danger for a symlink', () => {
    // Symlink permissions are ignored wholesale, short-circuiting to the
    // single symlink note before any other check runs.
    const link: Permissions = {
      ...rwxrxrx,
      fileType: 'l',
      other: { read: true, write: true, execute: true },
      special: { setuid: true, setgid: false, sticky: false },
    }
    expect(getPermissionWarnings(link).some((w) => w.level === 'danger')).toBe(false)
  })

  it('does not flag the setuid + world-writable danger when nothing can execute the file', () => {
    const notExecutable: Permissions = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: true, execute: false },
      special: { setuid: true, setgid: false, sticky: false },
      fileType: '-',
    }
    expect(getPermissionWarnings(notExecutable).some((w) => w.level === 'danger')).toBe(false)
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

  it('treats setuid as active when only a triad other than owner can execute it', () => {
    // -rwSr--x: the owner's own execute bit is off (hence the capital "S"
    // glyph in symbolic notation), but "other" can still execute the file,
    // which is enough for setuid to take hold on exec. It must not be
    // reported as inert just because the owner's own bit is off.
    const otherExecOnly: Permissions = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: false, write: false, execute: true },
      special: { setuid: true, setgid: false, sticky: false },
      fileType: '-',
    }
    const warnings = getPermissionWarnings(otherExecOnly)
    expect(warnings.some((w) => /runs with the owner's identity/i.test(w.message))).toBe(true)
    expect(warnings.some((w) => /has no effect/i.test(w.message))).toBe(false)
  })

  it('notes that setuid is inert when no class can execute the file at all', () => {
    const noExec: Permissions = {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
      special: { setuid: true, setgid: false, sticky: false },
      fileType: '-',
    }
    expect(getPermissionWarnings(noExec).some((w) => /nothing can execute this file/i.test(w.message))).toBe(true)
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
