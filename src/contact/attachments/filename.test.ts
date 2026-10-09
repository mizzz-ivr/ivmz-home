import { describe, expect, it } from 'vitest'

import { extensionOf, matchDeclaredType } from './catalog'
import { hasDangerousDoubleExtension, sanitizeFilename } from './filename'

describe('sanitizeFilename', () => {
  it('drops paths, control characters and bidi overrides', () => {
    expect(sanitizeFilename('..\\..\\evil/report.pdf')).toBe(
      '....evilreport.pdf'.replace(/^\.+/, ''),
    )
    expect(sanitizeFilename('invoice‮fdp.exe')).toBe('invoicefdp.exe')
    expect(sanitizeFilename('a\u0000b.png')).toBe('ab.png')
  })

  it('falls back for empty names and caps length while keeping the extension', () => {
    expect(sanitizeFilename('///')).toBe('attachment')
    const long = `${'a'.repeat(300)}.pdf`
    const cleaned = sanitizeFilename(long)
    expect(cleaned.length).toBeLessThanOrEqual(120)
    expect(cleaned.endsWith('.pdf')).toBe(true)
  })
})

describe('type matching', () => {
  it('requires both the extension and the declared MIME to match an allowed type', () => {
    expect(matchDeclaredType('a.png', 'image/png', ['png'])?.id).toBe('png')
    expect(matchDeclaredType('a.png', 'image/jpeg', ['png', 'jpeg'])).toBeUndefined()
    expect(matchDeclaredType('a.exe', 'image/png', ['png'])).toBeUndefined()
    expect(matchDeclaredType('a.pdf', 'application/pdf', ['png'])).toBeUndefined()
    expect(matchDeclaredType('A.JPG', 'IMAGE/JPEG', ['jpeg'])?.id).toBe('jpeg')
  })

  it('flags executable-looking inner extensions', () => {
    expect(hasDangerousDoubleExtension('report.exe.pdf')).toBe(true)
    expect(hasDangerousDoubleExtension('my.report.v2.pdf')).toBe(false)
    expect(extensionOf('noext')).toBe('')
  })
})
