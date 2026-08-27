import { describe, expect, it } from 'vitest'

import { createPublishedSlugWhere } from '@/lib/payload-detail-query'

describe('published detail query contract', () => {
  it('matches the requested slug exactly and keeps published status mandatory', () => {
    expect(createPublishedSlugWhere('Exact-Slug')).toEqual({
      and: [{ slug: { equals: 'Exact-Slug' } }, { _status: { equals: 'published' } }],
    })
  })
})
