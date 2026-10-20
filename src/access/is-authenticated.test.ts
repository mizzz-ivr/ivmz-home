import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { canDeleteContactSubmission, ContactSubmissions } from '@/collections/ContactSubmissions'
import { Users } from '@/collections/Users'

import { isAuthenticated } from './is-authenticated'

type AccessArgs = Parameters<Access>[0]

function accessArgs(collection?: string, adminCollection = 'users'): AccessArgs {
  return {
    req: {
      payload: { config: { admin: { user: adminCollection } } },
      user: collection ? { collection, id: 'test-id' } : null,
    },
  } as AccessArgs
}

describe('Payload admin collection access', () => {
  it('allows the configured CMS admin collection', async () => {
    expect(await isAuthenticated(accessArgs('users'))).toBe(true)
    expect(await isAuthenticated(accessArgs('site-admins', 'site-admins'))).toBe(true)
  })

  it('rejects anonymous and other authenticated collections', async () => {
    expect(await isAuthenticated(accessArgs())).toBe(false)
    expect(await isAuthenticated(accessArgs('customers'))).toBe(false)
    expect(await isAuthenticated(accessArgs('users', 'site-admins'))).toBe(false)
  })

  it('applies the same guard to the contact inbox and admin panel', () => {
    expect(ContactSubmissions.access?.read).toBe(isAuthenticated)
    expect(ContactSubmissions.access?.update).toBe(isAuthenticated)
    expect(ContactSubmissions.access?.delete).toBe(canDeleteContactSubmission)
    expect(canDeleteContactSubmission(accessArgs('users'))).toEqual({
      'attachments.id': { exists: false },
    })
    expect(canDeleteContactSubmission(accessArgs('customers'))).toBe(false)
    expect(Users.access?.admin).toBe(isAuthenticated)
  })
})
