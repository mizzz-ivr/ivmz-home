import { describe, expect, it } from 'vitest'

import { isAuthenticated } from '@/access/is-authenticated'

import { AnonymousMessages } from './AnonymousMessages'

const findField = (name: string) => {
  const field = AnonymousMessages.fields.find((item) => 'name' in item && item.name === name)
  if (!field || !('name' in field)) throw new Error(`Missing field: ${name}`)
  return field
}

describe('anonymous-messages inbox access', () => {
  it('keeps public CRUD closed, and reuses the configured admin-collection check', () => {
    expect(AnonymousMessages.access?.create).toBeTypeOf('function')
    expect(AnonymousMessages.access?.read).toBe(isAuthenticated)
    expect(AnonymousMessages.access?.update).toBe(isAuthenticated)
    expect(AnonymousMessages.access?.delete).toBe(isAuthenticated)
  })

  it('never permits the message, idempotency key, or publication flags in client writes', () => {
    for (const name of ['message', 'requestId', 'isPublic', 'publicId', 'publishedAt']) {
      const field = findField(name)
      expect('access' in field && field.access?.create).toBeTypeOf('function')
      expect('access' in field && field.access?.update).toBeTypeOf('function')
      expect('admin' in field && field.admin?.readOnly).toBe(true)
    }
  })

  it('starts private and keeps the reply and triage editable for administrators', () => {
    const status = findField('status')
    const publicField = findField('isPublic')
    expect('defaultValue' in status && status.defaultValue).toBe('new')
    expect('defaultValue' in publicField && publicField.defaultValue).toBe(false)
    expect('unique' in findField('requestId') && findField('requestId').unique).toBe(true)
    expect('unique' in findField('publicId') && findField('publicId').unique).toBe(true)
    expect('access' in findField('reply') && findField('reply').access).toBeUndefined()
    expect('access' in findField('internalNote') && findField('internalNote').access).toBeUndefined()
  })
})
