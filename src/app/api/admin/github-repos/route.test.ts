import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => vi.fn())
const fetchOwnerRepos = vi.hoisted(() => vi.fn())

vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('../../../../payload.config', () => ({ default: {} }))
vi.mock('@/lib/github-repo-list', async (original) => ({
  ...(await original<typeof import('@/lib/github-repo-list')>()),
  fetchOwnerRepos,
}))

import { GET } from './route'

const request = () => new Request('http://localhost:3000/api/admin/github-repos')

describe('GET /api/admin/github-repos', () => {
  beforeEach(() => {
    auth.mockReset()
    fetchOwnerRepos.mockReset()
  })

  it('requires an admin session and does not call GitHub without one', async () => {
    auth.mockResolvedValue({ user: null })
    expect((await GET(request())).status).toBe(401)
    expect(fetchOwnerRepos).not.toHaveBeenCalled()
  })

  it('returns the repositories with a ready-made Work draft', async () => {
    auth.mockResolvedValue({ user: { id: 1 } })
    fetchOwnerRepos.mockResolvedValue([
      {
        archived: false,
        description: 'Hello',
        fork: false,
        language: 'Go',
        name: 'site-sentry-go',
        pushedAt: null,
        stars: 1,
        topics: [],
        url: 'https://github.com/mizzz-ivr/site-sentry-go',
      },
    ])
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.repos[0].draft).toEqual({
      githubUrl: 'https://github.com/mizzz-ivr/site-sentry-go',
      stack: ['Go'],
      summary: 'Hello',
      title: 'site-sentry-go',
    })
  })

  it('reports unavailable instead of failing when GitHub cannot be reached', async () => {
    auth.mockResolvedValue({ user: { id: 1 } })
    fetchOwnerRepos.mockResolvedValue(null)
    const response = await GET(request())
    expect(await response.json()).toEqual({ repos: [], unavailable: true })
  })
})
