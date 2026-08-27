import { describe, expect, it } from 'vitest'

import {
  getDatabasePoolConfig,
  resolveDatabaseConnectionString,
  resolveDatabasePoolMode,
} from './database-connection'

const sessionPoolerUrl =
  'postgresql://ivmz_home_app.example:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require'

describe('resolveDatabasePoolMode', () => {
  it('Netlify Functions runtimeではtransaction modeを既定にする', () => {
    expect(resolveDatabasePoolMode(undefined, 'netlify-function-name')).toBe('transaction')
  })

  it('明示したsession modeを優先する', () => {
    expect(resolveDatabasePoolMode('session', 'netlify-function-name')).toBe('session')
  })

  it('Functions runtime外かつ未設定ではmodeを追加しない', () => {
    expect(resolveDatabasePoolMode(undefined, undefined)).toBeUndefined()
  })
})

describe('resolveDatabaseConnectionString', () => {
  it('Supabase session poolerをtransaction modeへ切り替える', () => {
    expect(resolveDatabaseConnectionString(sessionPoolerUrl, 'transaction')).toBe(
      'postgresql://ivmz_home_app.example:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require',
    )
  })

  it('session modeでは元の接続先を維持する', () => {
    expect(resolveDatabaseConnectionString(sessionPoolerUrl, 'session')).toBe(sessionPoolerUrl)
  })

  it('Supabase pooler以外のDATABASE_URLは変更しない', () => {
    const directUrl = 'postgresql://app:password@db.example.com:5432/postgres'

    expect(resolveDatabaseConnectionString(directUrl, 'transaction')).toBe(directUrl)
  })

  it('不正なDATABASE_URLを破壊しない', () => {
    expect(resolveDatabaseConnectionString('not-a-database-url', 'transaction')).toBe(
      'not-a-database-url',
    )
  })
})

describe('getDatabasePoolConfig', () => {
  it('transaction poolerではPayload初期化後のquery用接続枠を確保する', () => {
    expect(getDatabasePoolConfig(sessionPoolerUrl, 'transaction')).toEqual({
      connectionString:
        'postgresql://ivmz_home_app.example:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require',
      max: 5,
    })
  })

  it('migration/local向けsession接続にはpool制限を追加しない', () => {
    expect(getDatabasePoolConfig(sessionPoolerUrl, undefined)).toEqual({
      connectionString: sessionPoolerUrl,
    })
  })
})
