import { describe, expect, it, vi } from 'vitest'

import {
  MAX_REPOS_PER_RENDER,
  fetchGitHubRepoStats,
  getGitHubRepoStatsByUrl,
  parseGitHubRepo,
} from './github-repo'

const okBody = {
  archived: false,
  forks_count: 2,
  language: 'TypeScript',
  pushed_at: '2026-10-01T00:00:00Z',
  stargazers_count: 7,
}
const okResponse = () => new Response(JSON.stringify(okBody), { status: 200 })

describe('parseGitHubRepo', () => {
  it('reads owner/repo from a repository URL', () => {
    expect(parseGitHubRepo('https://github.com/mizzz-ivr/ivmz-home')).toEqual({
      owner: 'mizzz-ivr',
      repo: 'ivmz-home',
    })
    expect(parseGitHubRepo('https://github.com/mizzz-ivr/ivmz-home/')).toEqual({
      owner: 'mizzz-ivr',
      repo: 'ivmz-home',
    })
    expect(parseGitHubRepo('https://github.com/mizzz-ivr/ivmz-home.git')?.repo).toBe('ivmz-home')
  })

  it('rejects profiles, deep links, other hosts and unsafe URLs', () => {
    for (const value of [
      'https://github.com/mizzz-ivr',
      'https://github.com/mizzz-ivr/ivmz-home/issues',
      'https://github.com.evil.example/mizzz-ivr/ivmz-home',
      'https://evil.example/github.com/mizzz-ivr/ivmz-home',
      'http://github.com/mizzz-ivr/ivmz-home',
      'https://user:pw@github.com/mizzz-ivr/ivmz-home',
      'https://github.com:8443/mizzz-ivr/ivmz-home',
      'https://github.com/-bad/ivmz-home',
      'https://github.com/mizzz-ivr/..',
      'not a url',
      '',
      null,
      undefined,
    ]) {
      expect(parseGitHubRepo(value)).toBeNull()
    }
  })
})

describe('fetchGitHubRepoStats', () => {
  it('maps the API response and sends no credentials without a token', async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse())
    const stats = await fetchGitHubRepoStats({ owner: 'a', repo: 'b' }, fetcher, undefined)

    expect(stats).toEqual({
      archived: false,
      forks: 2,
      language: 'TypeScript',
      pushedAt: '2026-10-01T00:00:00Z',
      stars: 7,
    })
    expect(fetcher.mock.calls[0][0]).toBe('https://api.github.com/repos/a/b')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('uses a token when configured', async () => {
    const fetcher = vi.fn().mockResolvedValue(okResponse())
    await fetchGitHubRepoStats({ owner: 'a', repo: 'b' }, fetcher, 'tok')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  })

  it('returns null on HTTP errors, bad shapes and network failures', async () => {
    const ref = { owner: 'a', repo: 'b' }
    expect(
      await fetchGitHubRepoStats(
        ref,
        vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      ),
    ).toBeNull()
    expect(
      await fetchGitHubRepoStats(
        ref,
        vi.fn().mockResolvedValue(new Response('{"x":1}', { status: 200 })),
      ),
    ).toBeNull()
    expect(await fetchGitHubRepoStats(ref, vi.fn().mockRejectedValue(new Error('down')))).toBeNull()
  })
})

describe('getGitHubRepoStatsByUrl', () => {
  it('only requests linked repository URLs, once each, and caps the count', async () => {
    const fetcher = vi.fn().mockImplementation(async () => okResponse())
    const urls = [
      'https://github.com/o/r1',
      'https://github.com/o/r1',
      'https://github.com/o',
      'https://evil.example/o/r',
      null,
      ...Array.from({ length: 30 }, (_, index) => `https://github.com/o/extra${index}`),
    ]

    const result = await getGitHubRepoStatsByUrl(urls, fetcher)

    expect(fetcher.mock.calls.length).toBe(MAX_REPOS_PER_RENDER)
    expect(result.get('https://github.com/o/r1')?.stars).toBe(7)
    expect(result.has('https://github.com/o')).toBe(false)
  })
})
