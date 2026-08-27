export function createPublishedSlugWhere(slug: string) {
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
