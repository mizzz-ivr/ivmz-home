import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RepoStats } from './RepoStats'

describe('RepoStats', () => {
  it('renders nothing without stats', () => {
    expect(renderToStaticMarkup(<RepoStats stats={undefined} />)).toBe('')
  })

  it('shows counts, language, date and archived flag with accessible labels', () => {
    const html = renderToStaticMarkup(
      <RepoStats
        stats={{
          archived: true,
          forks: 2,
          language: 'TypeScript',
          pushedAt: '2026-10-01T12:00:00Z',
          stars: 7,
        }}
      />,
    )

    expect(html).toContain('aria-label="7 stars"')
    expect(html).toContain('aria-label="2 forks"')
    expect(html).toContain('TypeScript')
    expect(html).toContain('updated 2026-10-01')
    expect(html).toContain('archived')
  })

  it('omits the date when it is missing or invalid', () => {
    const html = renderToStaticMarkup(
      <RepoStats
        stats={{ archived: false, forks: 0, language: null, pushedAt: 'nope', stars: 0 }}
      />,
    )
    expect(html).not.toContain('updated')
  })
})
