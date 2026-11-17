import { describe, expect, it } from 'vitest'

import { assertPreviewDatabaseTarget } from './assert-preview-database.mjs'

const HOST = '13.197.31.66'
const PREVIEW_DB = 'ivmz_home_preview'
const PROD_DB = 'ivmz_home'

function baseEnv(overrides = {}) {
  return {
    CONTEXT: 'deploy-preview',
    DATABASE_URL: `postgresql://ivmz_preview_runtime:secret@${HOST}:5432/${PREVIEW_DB}?sslmode=no-verify`,
    PAYLOAD_PREVIEW_DATABASE_HOST: HOST,
    PAYLOAD_PREVIEW_DATABASE_NAME: PREVIEW_DB,
    PAYLOAD_PRODUCTION_DATABASE_HOST: HOST,
    PAYLOAD_PRODUCTION_DATABASE_NAME: PROD_DB,
    ...overrides,
  }
}

describe('assertPreviewDatabaseTarget', () => {
  it('accepts the Preview database connection for deploy previews', () => {
    expect(assertPreviewDatabaseTarget(baseEnv())).toEqual({
      context: 'deploy-preview',
      host: HOST,
      database: PREVIEW_DB,
    })
  })

  it('accepts the Preview database connection for branch deploys', () => {
    expect(assertPreviewDatabaseTarget(baseEnv({ CONTEXT: 'branch-deploy' }))).toEqual({
      context: 'branch-deploy',
      host: HOST,
      database: PREVIEW_DB,
    })
  })

  it('rejects production context', () => {
    expect(() => assertPreviewDatabaseTarget(baseEnv({ CONTEXT: 'production' }))).toThrow(
      'database migration is disabled for Netlify context',
    )
  })

  it('rejects the Production database even in a preview context', () => {
    expect(() =>
      assertPreviewDatabaseTarget(
        baseEnv({
          DATABASE_URL: `postgresql://ivmz_runtime:secret@${HOST}:5432/${PROD_DB}?sslmode=no-verify`,
        }),
      ),
    ).toThrow('refusing to migrate the Production database')
  })

  it('rejects another database on the same host', () => {
    expect(() =>
      assertPreviewDatabaseTarget(
        baseEnv({
          DATABASE_URL: `postgresql://ivmz_preview_runtime:secret@${HOST}:5432/ivmz_other`,
        }),
      ),
    ).toThrow('DATABASE_URL does not target the configured Preview database')
  })

  it('rejects a missing database URL without exposing a secret', () => {
    expect(() => assertPreviewDatabaseTarget(baseEnv({ DATABASE_URL: '' }))).toThrow(
      'DATABASE_URL is not configured',
    )
  })

  it('requires valid, distinct database targets for every preview deploy', () => {
    for (const overrides of [
      { PAYLOAD_PRODUCTION_DATABASE_HOST: '' },
      { PAYLOAD_PREVIEW_DATABASE_HOST: '' },
      { PAYLOAD_PREVIEW_DATABASE_NAME: '' },
      { PAYLOAD_PREVIEW_DATABASE_NAME: 'malformed-name!' },
      { PAYLOAD_PRODUCTION_DATABASE_NAME: PREVIEW_DB },
    ]) {
      expect(() => assertPreviewDatabaseTarget(baseEnv(overrides))).toThrow(
        'Preview and Production database targets must be valid and distinct',
      )
    }
  })

  it('rejects disguised connection targets and invalid protocols', () => {
    for (const databaseUrl of [
      `postgresql://ivmz_preview_runtime:secret@${HOST}.attacker.invalid:5432/${PREVIEW_DB}`,
      `postgresql://ivmz_preview_runtime:secret@203.0.113.10:5432/${PREVIEW_DB}`,
      `https://${HOST}:5432/${PREVIEW_DB}`,
    ]) {
      expect(() => assertPreviewDatabaseTarget(baseEnv({ DATABASE_URL: databaseUrl }))).toThrow()
    }
  })

  it('rejects malformed URLs without exposing credentials', () => {
    const secret = 'NeverLeakCredentialsOrTokens'
    const databaseUrl = `postgresql://ivmz_preview_runtime:${secret}@${HOST}:5432/%E0%A4%A`
    try {
      assertPreviewDatabaseTarget(baseEnv({ DATABASE_URL: databaseUrl }))
    } catch (error) {
      expect(String(error)).not.toContain(secret)
      return
    }
    throw new Error('expected assertPreviewDatabaseTarget to throw')
  })
})
