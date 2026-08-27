import type { Where } from 'payload'

export function createPublishedSlugWhere(slug: string): Where {
  return {
    and: [
      {
        slug: {
          equals: slug,
        },
      },
      {
        _status: {
          equals: 'published',
        },
      },
    ],
  }
}
