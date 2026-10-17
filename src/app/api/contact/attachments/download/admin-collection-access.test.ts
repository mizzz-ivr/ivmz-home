import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const find = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({
    auth,
    config: { admin: { user: 'users' } },
    find,
  }),
}))
vi.mock('../../../../../payload.config', () => ({ default: {} }))

import { GET } from './route'

const download = () =>
  GET(new Request('https://ivmz.ivrm.jp/api/contact/attachments/download?row=valid-123'))

beforeEach(() => {
  vi.clearAllMocks()
  find.mockResolvedValue({ docs: [] })
})

describe('CMS attachment download authentication collection', () => {
  it('rejects anonymous visitors without database access', async () => {
    auth.mockResolvedValue({ user: null })
    expect((await download()).status).toBe(401)
    expect(find).not.toHaveBeenCalled()
  })

  it('does not allow authenticated users from another collection', async () => {
    auth.mockResolvedValue({ user: { collection: 'customers', id: 'visitor-1' } })
    expect((await download()).status).toBe(403)
    expect(find).not.toHaveBeenCalled()
  })

  it('keeps legitimate admin users able to use the existing inbox access checks', async () => {
    const user = { collection: 'users', id: 'admin-1' }
    auth.mockResolvedValue({ user })
    expect((await download()).status).toBe(404)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'contact-submissions',
        overrideAccess: false,
        user,
      }),
    )
  })
})
