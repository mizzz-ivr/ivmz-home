import type { Access, CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { News } from '@/collections/News'
import { Posts } from '@/collections/Posts'
import { Schedule } from '@/collections/Schedule'
import { SocialLinks } from '@/collections/SocialLinks'
import { Works } from '@/collections/Works'
import {
  enabledSocialOrAuthenticated,
  publicScheduleOrAuthenticated,
  publishedOrAuthenticated,
} from '@/content/access'
import {
  createSlugField,
  normalizeSlug,
  validateOptionalHttpUrl,
  validateRequiredHttpUrl,
} from '@/content/fields'

const collections = [Works, Posts, News, Schedule, SocialLinks]

function runAccess(access: Access | undefined, authenticated: boolean) {
  if (!access) throw new Error('Expected access function')

  return access({
    req: {
      user: authenticated ? { id: 1 } : null,
    },
  } as unknown as Parameters<Access>[0])
}

function findField(collection: CollectionConfig, name: string): Field | undefined {
  const visit = (fields: Field[]): Field | undefined => {
    for (const field of fields) {
      if ('name' in field && field.name === name) return field
      if (field.type === 'group') {
        const nested = visit(field.fields)
        if (nested) return nested
      }
    }
  }

  return visit(collection.fields)
}

describe('content access control', () => {
  it('denies anonymous mutations for every public content collection', () => {
    for (const collection of collections) {
      expect(runAccess(collection.access?.create, false)).toBe(false)
      expect(runAccess(collection.access?.update, false)).toBe(false)
      expect(runAccess(collection.access?.delete, false)).toBe(false)
    }
  })

  it('allows authenticated CMS users to manage content', () => {
    for (const collection of collections) {
      expect(runAccess(collection.access?.create, true)).toBe(true)
      expect(runAccess(collection.access?.update, true)).toBe(true)
      expect(runAccess(collection.access?.delete, true)).toBe(true)
    }
  })

  it('restricts anonymous draft-enabled reads to published documents', () => {
    expect(runAccess(publishedOrAuthenticated, false)).toEqual({
      _status: { equals: 'published' },
    })
    expect(runAccess(publishedOrAuthenticated, true)).toBe(true)
  })

  it('restricts anonymous schedule and social reads to public data', () => {
    expect(runAccess(publicScheduleOrAuthenticated, false)).toEqual({
      visibility: { equals: 'public' },
    })
    expect(runAccess(enabledSocialOrAuthenticated, false)).toEqual({
      enabled: { equals: true },
    })
  })
})

describe('slug fields', () => {
  it('normalizes human titles into stable URL-safe slugs', () => {
    expect(normalizeSlug('  Hello, Payload CMS!  ')).toBe('hello-payload-cms')
    expect(normalizeSlug('技術 記事 2026')).toBe('技術-記事-2026')
  })

  it('uses one shared required and unique slug contract', () => {
    const slug = createSlugField()

    expect('required' in slug && slug.required).toBe(true)
    expect('unique' in slug && slug.unique).toBe(true)
    expect('index' in slug && slug.index).toBe(true)

    for (const collection of [Works, Posts, News]) {
      const field = findField(collection, 'slug')
      expect(field).toBeDefined()
      expect(field && 'required' in field && field.required).toBe(true)
      expect(field && 'unique' in field && field.unique).toBe(true)
    }
  })
})

describe('URL validation', () => {
  it('accepts HTTP(S) URLs and rejects unsafe or malformed values', () => {
    expect(validateOptionalHttpUrl('https://example.com/path')).toBe(true)
    expect(validateOptionalHttpUrl('http://localhost:3000')).toBe(true)
    expect(validateOptionalHttpUrl('mailto:test@example.com')).not.toBe(true)
    expect(validateOptionalHttpUrl('not a url')).not.toBe(true)
    expect(validateOptionalHttpUrl('')).toBe(true)
    expect(validateRequiredHttpUrl('')).not.toBe(true)
  })
})

describe('content schema guards', () => {
  it('keeps the required core fields explicit', () => {
    const requiredFields: Array<[CollectionConfig, string[]]> = [
      [Works, ['title', 'slug', 'summary', 'role', 'stack', 'projectStatus']],
      [Posts, ['title', 'slug', 'excerpt', 'body', 'category']],
      [News, ['title', 'slug', 'body', 'type']],
      [Schedule, ['title', 'type', 'startAt', 'timezone', 'visibility']],
      [SocialLinks, ['platform', 'url', 'enabled', 'order']],
    ]

    for (const [collection, names] of requiredFields) {
      for (const name of names) {
        const field = findField(collection, name)
        expect(field, `${collection.slug}.${name}`).toBeDefined()
        expect(field && 'required' in field && field.required, `${collection.slug}.${name}`).toBe(
          true,
        )
      }
    }
  })

  it('uses Payload drafts for Works, Posts, and News without a duplicate publish status field', () => {
    for (const collection of [Works, Posts, News]) {
      expect(collection.versions).toEqual({ drafts: true })
      expect(findField(collection, 'status')).toBeUndefined()
    }
  })
})
