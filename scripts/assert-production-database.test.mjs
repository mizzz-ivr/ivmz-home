import { describe, expect, it } from 'vitest'

import { assertProductionDatabaseTarget } from './assert-production-database.mjs'

const HOST = '13.197.31.66'
const PROD_DB = 'ivmz_home'
const PREVIEW_DB = 'ivmz_home_preview'

function env(overrides = {}) {
  return {
    CONTEXT: 'production',
    DATABASE_URL: `postgresql://ivmz_runtime:secret@${HOST}:5432/${PROD_DB}?sslmode=no-verify`,
    PAYLOAD_PRODUCTION_DATABASE_HOST: HOST,
    PAYLOAD_PRODUCTION_DATABASE_NAME: PROD_DB,
    PAYLOAD_PREVIEW_DATABASE_HOST: HOST,
    PAYLOAD_PREVIEW_DATABASE_NAME: PREVIEW_DB,
    ...overrides,
  }
}

describe('assertProductionDatabaseTarget', () => {
  it('accepts the configured Production connection without writing data', () => {
    expect(assertProductionDatabaseTarget(env())).toEqual({
      context: 'production',
      host: HOST,
      database: PROD_DB,
    })
  })

  it('accepts the postgres protocol and an explicit port', () => {
    expect(
      assertProductionDatabaseTarget(
        env({ DATABASE_URL: `postgres://ivmz_runtime:secret@${HOST}:5432/${PROD_DB}` }),
      ),
    ).toEqual({ context: 'production', host: HOST, database: PROD_DB })
  })

  it('rejects Preview and branch-deploy contexts', () => {
    for (const context of ['deploy-preview', 'branch-deploy', '', 'dev']) {
      expect(() => assertProductionDatabaseTarget(env({ CONTEXT: context }))).toThrow(
        'requires Netlify production context',
      )
    }
  })

  it('rejects connections to the separate Preview database on the same host', () => {
    expect(() =>
      assertProductionDatabaseTarget(
        env({
          DATABASE_URL: `postgresql://ivmz_preview_runtime:secret@${HOST}:5432/${PREVIEW_DB}?sslmode=no-verify`,
        }),
      ),
    ).toThrow('must not target the Preview database')
  })

  it('rejects unrelated hosts, database names and disguised targets', () => {
    for (const url of [
      `postgresql://ivmz_runtime:secret@203.0.113.10:5432/${PROD_DB}`,
      `postgresql://ivmz_runtime:secret@${HOST}:5432/ivmz_other`,
      `postgresql://ivmz_runtime:secret@${HOST}.attacker.invalid:5432/${PROD_DB}`,
      `postgresql://ivmz_runtime:secret@${HOST}:5432/${PROD_DB}%2f..`,
      `https://${HOST}:5432/${PROD_DB}`,
    ]) {
      expect(() => assertProductionDatabaseTarget(env({ DATABASE_URL: url }))).toThrow()
    }
  })

  it('fails closed for missing, malformed or matching target configuration', () => {
    for (const overrides of [
      { DATABASE_URL: '' },
      { DATABASE_URL: 'not-a-url' },
      { PAYLOAD_PRODUCTION_DATABASE_HOST: '' },
      { PAYLOAD_PRODUCTION_DATABASE_NAME: '' },
      { PAYLOAD_PRODUCTION_DATABASE_NAME: 'malformed-name!' },
      { PAYLOAD_PREVIEW_DATABASE_HOST: '' },
      { PAYLOAD_PREVIEW_DATABASE_NAME: PROD_DB },
      {
        PAYLOAD_PREVIEW_DATABASE_HOST: HOST,
        PAYLOAD_PREVIEW_DATABASE_NAME: PROD_DB,
      },
    ]) {
      expect(() => assertProductionDatabaseTarget(env(overrides))).toThrow()
    }
  })

  it('never includes DB secrets in diagnostic errors', () => {
    const secret = 'NeverLeakCredentialsOrTokens'
    expect(() =>
      assertProductionDatabaseTarget(
        env({ DATABASE_URL: `postgresql://ivmz_runtime:${secret}@203.0.113.10:5432/${PROD_DB}` }),
      ),
    ).toThrow('does not target the configured Production database')
    try {
      assertProductionDatabaseTarget(
        env({ DATABASE_URL: `postgresql://ivmz_runtime:${secret}@203.0.113.10:5432/${PROD_DB}` }),
      )
    } catch (error) {
      expect(String(error)).not.toContain(secret)
    }
  })
})
