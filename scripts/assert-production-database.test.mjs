import { describe, expect, it } from 'vitest'

import { assertProductionDatabaseTarget } from './assert-production-database.mjs'

const PROD = 'drazbrcqnjxjuygfxmlz'
const PREVIEW = 'dzdgbkjmomvmexcbjyin'

function env(overrides = {}) {
  return {
    CONTEXT: 'production',
    DATABASE_URL: `postgresql://postgres:secret@db.${PROD}.supabase.co:5432/postgres`,
    PAYLOAD_PRODUCTION_DATABASE_PROJECT_REF: PROD,
    PAYLOAD_PREVIEW_DATABASE_PROJECT_REF: PREVIEW,
    ...overrides,
  }
}

describe('assertProductionDatabaseTarget', () => {
  it('accepts the configured direct Production connection without writing data', () => {
    expect(assertProductionDatabaseTarget(env())).toEqual({
      context: 'production',
      projectRef: PROD,
    })
  })

  it('accepts the Production pooler when the username identifies the right project', () => {
    expect(
      assertProductionDatabaseTarget(
        env({
          DATABASE_URL: `postgres://postgres.${PROD}:secret@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
      ),
    ).toEqual({ context: 'production', projectRef: PROD })
  })

  it('accepts a dedicated Production database role on the expected Supabase pooler', () => {
    for (const role of ['app_runtime', 'payload_reader', 'postgres']) {
      expect(
        assertProductionDatabaseTarget(
          env({
            DATABASE_URL: `postgresql://${role}.${PROD}:secret@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres`,
          }),
        ),
      ).toEqual({ context: 'production', projectRef: PROD })
    }
  })

  it('rejects dedicated roles targeting Preview or unrelated Supabase projects', () => {
    for (const projectRef of [PREVIEW, 'aaaaaaaaaaaaaaaaaaaa']) {
      expect(() =>
        assertProductionDatabaseTarget(
          env({
            DATABASE_URL: `postgresql://app_runtime.${projectRef}:secret@aws-1.pooler.supabase.com:6543/postgres`,
          }),
        ),
      ).toThrow()
    }
    expect(() =>
      assertProductionDatabaseTarget(
        env({
          DATABASE_URL: `postgresql://app_runtime.${PREVIEW}:secret@aws-1.pooler.supabase.com:6543/postgres`,
        }),
      ),
    ).toThrow('must not target the Preview project')
  })

  it('rejects empty, multi-dot and malformed pooler usernames', () => {
    for (const username of [
      `.${PROD}`,
      `postgres.admin.${PROD}`,
      `app-runtime.${PROD}`,
      `app_runtime.${PROD}.other`,
      `postgres.${PREVIEW}`,
      `app_runtime.${PROD}%2Eattacker`,
    ]) {
      expect(() =>
        assertProductionDatabaseTarget(
          env({
            DATABASE_URL: `postgresql://${username}:secret@aws-1.pooler.supabase.com:6543/postgres`,
          }),
        ),
      ).toThrow()
    }
  })

  it('rejects Preview and branch-deploy contexts', () => {
    for (const context of ['deploy-preview', 'branch-deploy', '', 'dev']) {
      expect(() => assertProductionDatabaseTarget(env({ CONTEXT: context }))).toThrow(
        'requires Netlify production context',
      )
    }
  })

  it('rejects connections to the separate Preview Supabase project', () => {
    for (const url of [
      `postgresql://postgres:secret@db.${PREVIEW}.supabase.co/postgres`,
      `postgresql://postgres.${PREVIEW}:secret@aws-1.pooler.supabase.com/postgres`,
    ]) {
      expect(() => assertProductionDatabaseTarget(env({ DATABASE_URL: url }))).toThrow(
        'must not target the Preview project',
      )
    }
  })

  it('rejects unrelated project, fake pooler username, hostname suffix and invalid protocol', () => {
    for (const url of [
      'postgresql://postgres:secret@db.aaaaaaaaaaaaaaaaaaaa.supabase.co/postgres',
      `postgresql://postgres.other:secret@aws-1.pooler.supabase.com/postgres`,
      `postgresql://postgres:secret@db.${PROD}.supabase.co.attacker.invalid/postgres`,
      `https://db.${PROD}.supabase.co/postgres`,
    ]) {
      expect(() => assertProductionDatabaseTarget(env({ DATABASE_URL: url }))).toThrow()
    }
  })

  it('fails closed for missing, malformed or matching references', () => {
    for (const overrides of [
      { DATABASE_URL: '' },
      { DATABASE_URL: 'not a URL' },
      { PAYLOAD_PRODUCTION_DATABASE_PROJECT_REF: '' },
      { PAYLOAD_PREVIEW_DATABASE_PROJECT_REF: PROD },
      { PAYLOAD_PREVIEW_DATABASE_PROJECT_REF: '' },
    ]) {
      expect(() => assertProductionDatabaseTarget(env(overrides))).toThrow()
    }
  })

  it('never includes DB secrets in diagnostic errors', () => {
    const secret = 'NeverLeakCredentialsOrTokens'
    expect(() =>
      assertProductionDatabaseTarget(
        env({ DATABASE_URL: `postgres://postgres:${secret}@evil.invalid/postgres` }),
      ),
    ).toThrow('does not target the configured Production project')
    try {
      assertProductionDatabaseTarget(
        env({ DATABASE_URL: `postgres://postgres:${secret}@evil.invalid/postgres` }),
      )
    } catch (error) {
      expect(String(error)).not.toContain(secret)
    }
  })
})
