import type { CollectionBeforeChangeHook } from 'payload'

export const setPublishedAtOnPublish: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data._status !== 'published' || data.publishedAt) return data

  return {
    ...data,
    publishedAt: originalDoc?.publishedAt ?? new Date().toISOString(),
  }
}
