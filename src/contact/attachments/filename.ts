const MAX_NAME_LENGTH = 120

// Control chars, path separators and bidi/zero-width controls that can disguise an extension.
const FORBIDDEN = /[\u0000-\u001f\u007f\\/:*?"<>|​-‏‪-‮⁦-⁩﻿]/g

/** Display name only: the object key is always a server-generated UUID. */
export function sanitizeFilename(input: string): string {
  const cleaned = input
    .normalize('NFKC')
    .replace(FORBIDDEN, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()

  if (!cleaned) return 'attachment'
  if (cleaned.length <= MAX_NAME_LENGTH) return cleaned

  const dot = cleaned.lastIndexOf('.')
  const extension = dot > 0 ? cleaned.slice(dot) : ''
  return `${cleaned.slice(0, MAX_NAME_LENGTH - extension.length)}${extension}`
}

/** Reject names whose real type is hidden behind a second, executable-looking extension. */
const DANGEROUS_INNER_EXTENSIONS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'com',
  'scr',
  'msi',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'wsh',
  'jar',
  'lnk',
  'hta',
  'cpl',
  'reg',
  'sh',
  'app',
  'apk',
  'iso',
  'dmg',
])

export function hasDangerousDoubleExtension(filename: string): boolean {
  const parts = filename.toLowerCase().split('.').slice(1, -1)
  return parts.some((part) => DANGEROUS_INNER_EXTENSIONS.has(part.trim()))
}
