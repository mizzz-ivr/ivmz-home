import { describe, expect, it, vi } from 'vitest'

import {
  fetchOwnerRepos,
  ownerLogin,
  toWorkDraft,
  type GitHubRepoSummary,
} from './github-repo-list'

const repo = (extra: Partial<GitHubRepoSummary> = {}): GitHubRepoSummary => ({
  archived: false,
  description: 'A thing',
  fork: false,
  language: 'TypeScript',
  name: 'thing',
  pushedAt: '2026-10-01T00:00:00Z',
  stars: 3,
  topics: ['nextjs', 'payload'],
  url: 'https://github.com/mizzz-ivr/thing',
  ...extra,
})

describe('github repo list', () => {
  it('takes the owner from the site constants', () => {
    expect(ownerLogin()).toBe('mizzz-ivr')
  })

  it('maps a repository to a Work draft without duplicates or empty values', () => {
    expect(toWorkDraft(repo({ topics: ['TypeScript', 'nextjs'] }))).toEqual({
      githubUrl: 'https://github.com/mizzz-ivr/thing',
      stack: ['TypeScript', 'nextjs'],
      summary: 'A thing',
      title: 'thing',
    })
    expect(toWorkDraft(repo({ description: null, language: null, topics: [] }))).toMatchObject({
      stack: [],
      summary: '',
    })
    expect(toWorkDraft(repo({ description: 'x'.repeat(500) })).summary).toHaveLength(240)
    expect(
      toWorkDraft(repo({ topics: Array.from({ length: 20 }, (_, i) => `t${i}`) })).stack,
    ).toHaveLength(7)
  })

  it('lists only public github.com repositories and degrades to null on any failure', async () => {
    const ok = vi.fn(async () =>
      Response.json([
        { html_url: 'https://github.com/mizzz-ivr/a', name: 'a', stargazers_count: 2 },
        { html_url: 'https://github.com/mizzz-ivr/priv', name: 'priv', private: true },
        { html_url: 'https://evil.example/x', name: 'x' },
        { name: 'no-url' },
        'junk',
      ]),
    ) as unknown as typeof fetch
    const list = await fetchOwnerRepos(ok, undefined)
    expect(list?.map((item) => item.name)).toEqual(['a'])
    expect(String((ok as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      '/users/mizzz-ivr/repos',
    )

    for (const impl of [
      async () => new Response('nope', { status: 403 }),
      async () => Response.json({ message: 'not an array' }),
      async () => Promise.reject(new Error('down')),
    ]) {
      expect(await fetchOwnerRepos(impl as unknown as typeof fetch, undefined)).toBeNull()
    }
  })

  it('sends the optional token only as an Authorization header', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc')
      return Response.json([])
    }) as unknown as typeof fetch
    expect(await fetchOwnerRepos(fetcher, 'abc')).toEqual([])
  })
})
