import { describe, expect, it } from 'vitest'

import { buildGitHubProfile, parseGitHubProfileUrl } from './github-profile'

describe('parseGitHubProfileUrl', () => {
  it('accepts a plain profile URL', () => {
    expect(parseGitHubProfileUrl('https://github.com/mizzz-ivr')).toBe('mizzz-ivr')
    expect(parseGitHubProfileUrl('https://github.com/mizzz-ivr/')).toBe('mizzz-ivr')
  })

  it('rejects repo URLs and foreign hosts', () => {
    expect(parseGitHubProfileUrl('https://github.com/mizzz-ivr/ivmz-home')).toBeNull()
    expect(parseGitHubProfileUrl('https://example.com/mizzz-ivr')).toBeNull()
    expect(parseGitHubProfileUrl('not a url')).toBeNull()
    expect(parseGitHubProfileUrl(undefined)).toBeNull()
  })
})

describe('buildGitHubProfile', () => {
  const user = { followers: 3, public_repos: 11 }
  const repos = [
    {
      fork: false,
      html_url: 'https://github.com/mizzz-ivr/a',
      language: 'Python',
      name: 'a',
      pushed_at: '2026-11-01T00:00:00Z',
      stargazers_count: 1,
    },
    {
      fork: false,
      html_url: 'https://github.com/mizzz-ivr/b',
      language: 'TypeScript',
      name: 'b',
      pushed_at: '2026-11-10T00:00:00Z',
      stargazers_count: 0,
    },
    {
      fork: true,
      html_url: 'https://github.com/mizzz-ivr/c',
      language: 'Python',
      name: 'c',
      pushed_at: '2026-11-12T00:00:00Z',
      stargazers_count: 9,
    },
    {
      fork: false,
      html_url: 'https://github.com/mizzz-ivr/d',
      language: 'Python',
      name: 'd',
      pushed_at: '2026-10-01T00:00:00Z',
      stargazers_count: 2,
    },
  ]

  it('aggregates own repos only, newest first', () => {
    const profile = buildGitHubProfile('mizzz-ivr', 'https://github.com/mizzz-ivr', user, repos)
    expect(profile?.totalStars).toBe(3)
    expect(profile?.languages).toEqual([
      { count: 2, name: 'Python' },
      { count: 1, name: 'TypeScript' },
    ])
    expect(profile?.recentRepos.map((repo) => repo.name)).toEqual(['b', 'a', 'd'])
  })

  it('degrades to null on malformed bodies', () => {
    expect(buildGitHubProfile('mizzz-ivr', 'https://github.com/mizzz-ivr', null, repos)).toBeNull()
    expect(buildGitHubProfile('mizzz-ivr', 'https://github.com/mizzz-ivr', user, {})).toBeNull()
  })
})
