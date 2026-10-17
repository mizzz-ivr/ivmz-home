import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { ContactSubmissions } from '@/collections/ContactSubmissions'
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
    await expect(isAuthenticated(accessArgs('users'))).resolves.toBe(true)
    await expect(isAuthenticated(accessArgs('site-admins', 'site-admins'))).resolves.toBe(true)
  })

  it('rejects anonymous and other authenticated collections', async () => {
    await expect(isAuthenticated(accessArgs())).resolves.toBe(false)
    await expect(isAuthenticated(accessArgs('customers'))).resolves.toBe(false)
    await expect(isAuthenticated(accessArgs('users', 'site-admins'))).resolves.toBe(false)
  })

  it('applies the same guard to the contact inbox and admin panel', () => {
    expect(ContactSubmissions.access?.read).toBe(isAuthenticated)
    expect(ContactSubmissions.access?.update).toBe(isAuthenticated)
    expect(ContactSubmissions.access?.delete).toBe(isAuthenticated)
    expect(Users.access?.admin).toBe(isAuthenticated)
  })
})
