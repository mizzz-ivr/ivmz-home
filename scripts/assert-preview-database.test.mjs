import { describe, expect, it } from 'vitest'

import { assertPreviewDatabaseTarget } from './assert-preview-database.mjs'

const PREVIEW_REF = 'dzdgbkjmomvmexcbjyin'
const PRODUCTION_REF = 'drazbrcqnjxjuygfxmlz'

function baseEnv(overrides = {}) {
  return {
    CONTEXT: 'deploy-preview',
    DATABASE_URL: `postgresql://postgres:secret@db.${PREVIEW_REF}.supabase.co:5432/postgres`,
    PAYLOAD_PREVIEW_DATABASE_PROJECT_REF: PREVIEW_REF,
    PAYLOAD_PRODUCTION_DATABASE_PROJECT_REF: PRODUCTION_REF,
    ...overrides,
  }
}

describe('assertPreviewDatabaseTarget', () => {
  it('accepts the Preview project direct connection for deploy previews', () => {
    expect(assertPreviewDatabaseTarget(baseEnv())).toEqual({
      context: 'deploy-preview',
      projectRef: PREVIEW_REF,
    })
  })

  it('accepts the Preview project pooler connection for branch deploys', () => {
    expect(
      assertPreviewDatabaseTarget(
        baseEnv({
          CONTEXT: 'branch-deploy',
          DATABASE_URL: `postgresql://postgres.${PREVIEW_REF}:secret@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
      ),
    ).toEqual({
      context: 'branch-deploy',
      projectRef: PREVIEW_REF,
    })
  })

  it('rejects production context', () => {
    expect(() => assertPreviewDatabaseTarget(baseEnv({ CONTEXT: 'production' }))).toThrow(
      'database migration is disabled for Netlify context',
    )
  })

  it('rejects the Production project even in a preview context', () => {
    expect(() =>
      assertPreviewDatabaseTarget(
        baseEnv({
          DATABASE_URL: `postgresql://postgres:secret@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
        }),
      ),
    ).toThrow('refusing to migrate the Production Supabase project')
  })

  it('rejects another Supabase project', () => {
    expect(() =>
      assertPreviewDatabaseTarget(
        baseEnv({
          DATABASE_URL:
            'postgresql://postgres:secret@db.aaaaaaaaaaaaaaaaaaaa.supabase.co:5432/postgres',
        }),
      ),
    ).toThrow('DATABASE_URL does not target the configured Preview Supabase project')
  })

  it('rejects a missing database URL without exposing a secret', () => {
    expect(() => assertPreviewDatabaseTarget(baseEnv({ DATABASE_URL: '' }))).toThrow(
      'DATABASE_URL is not configured',
    )
  })
})
