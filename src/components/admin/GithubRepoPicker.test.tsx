import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dispatchFields = vi.fn()
const setModified = vi.fn()
const existing: Record<string, unknown> = {}

vi.mock('@payloadcms/ui', () => ({
  useForm: () => ({
    dispatchFields,
    getDataByPath: (path: string) => existing[path],
    setModified,
  }),
}))

import { GithubRepoPicker } from './GithubRepoPicker'

const repos = [
  {
    archived: false,
    description: 'Uptime checks',
    draft: {
      githubUrl: 'https://github.com/mizzz-ivr/site-sentry-go',
      stack: ['Go'],
      summary: 'Uptime checks',
      title: 'site-sentry-go',
    },
    fork: false,
    name: 'site-sentry-go',
    stars: 1,
    url: 'https://github.com/mizzz-ivr/site-sentry-go',
  },
  {
    archived: false,
    description: 'Upstream',
    draft: {
      githubUrl: 'https://github.com/mizzz-ivr/forked',
      stack: [],
      summary: '',
      title: 'forked',
    },
    fork: true,
    name: 'forked',
    stars: 0,
    url: 'https://github.com/mizzz-ivr/forked',
  },
]

describe('GithubRepoPicker', () => {
  beforeEach(() => {
    dispatchFields.mockClear()
    setModified.mockClear()
    for (const key of Object.keys(existing)) delete existing[key]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ repos })),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('hides forks by default and fills the URL plus empty fields on apply', async () => {
    render(<GithubRepoPicker />)
    const select = await screen.findByRole('combobox')
    expect(screen.queryByText(/forked/)).toBeNull()

    fireEvent.change(select, { target: { value: repos[0].url } })
    fireEvent.click(screen.getByRole('button', { name: 'この内容を入力する' }))

    const paths = dispatchFields.mock.calls.map((call) => call[0].path)
    expect(paths).toEqual(['githubUrl', 'title', 'summary', 'stack'])
    expect(setModified).toHaveBeenCalledWith(true)
  })

  it('never overwrites a title, summary or stack that is already filled', async () => {
    existing.title = 'My title'
    existing.summary = 'My summary'
    existing.stack = ['Rust']
    render(<GithubRepoPicker />)
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: repos[0].url } })
    fireEvent.click(screen.getByRole('button', { name: 'この内容を入力する' }))

    expect(dispatchFields.mock.calls.map((call) => call[0].path)).toEqual(['githubUrl'])
  })

  it('shows forks on request and explains when the list is unavailable', async () => {
    const { unmount } = render(<GithubRepoPicker />)
    await screen.findByRole('combobox')
    fireEvent.click(screen.getByLabelText(/fork・archived/))
    expect(screen.getByText(/forked/)).toBeTruthy()
    unmount()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ repos: [], unavailable: true })),
    )
    render(<GithubRepoPicker />)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('取得できませんでした'),
    )
  })
})
