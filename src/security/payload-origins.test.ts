import { describe, expect, it } from 'vitest'

import { PAYLOAD_PRODUCTION_ORIGIN, resolvePayloadAllowedOrigins } from './payload-origins'

describe('resolvePayloadAllowedOrigins', () => {
  it('Productionではcanonical originだけを許可する', () => {
    expect(
      resolvePayloadAllowedOrigins({
        CONTEXT: 'production',
        PAYLOAD_ALLOWED_ORIGINS: 'http://localhost:3000,https://attacker.invalid',
      }),
    ).toEqual([PAYLOAD_PRODUCTION_ORIGIN])
  })

  it('Deploy PreviewではDEPLOY_PRIME_URLのoriginだけを許可する', () => {
    expect(
      resolvePayloadAllowedOrigins({
        CONTEXT: 'deploy-preview',
        DEPLOY_PRIME_URL: 'https://deploy-preview-17--ivmz-home.netlify.app/some/path',
        PAYLOAD_ALLOWED_ORIGINS: PAYLOAD_PRODUCTION_ORIGIN,
      }),
    ).toEqual(['https://deploy-preview-17--ivmz-home.netlify.app'])
  })

  it('Branch DeployでもDEPLOY_PRIME_URLを優先する', () => {
    expect(
      resolvePayloadAllowedOrigins({
        CONTEXT: 'branch-deploy',
        DEPLOY_PRIME_URL: 'https://security-issue-17--ivmz-home.netlify.app',
      }),
    ).toEqual(['https://security-issue-17--ivmz-home.netlify.app'])
  })

  it('Preview URLを解決できない場合は明示allowlistへfail closedする', () => {
    expect(
      resolvePayloadAllowedOrigins({
        CONTEXT: 'deploy-preview',
        DEPLOY_PRIME_URL: 'not-a-url',
        PAYLOAD_ALLOWED_ORIGINS: 'https://preview.example.com',
      }),
    ).toEqual(['https://preview.example.com'])
  })

  it('local/CIでは明示allowlistを正規化・重複排除する', () => {
    expect(
      resolvePayloadAllowedOrigins({
        PAYLOAD_ALLOWED_ORIGINS:
          'http://localhost:3000/path, http://localhost:3000, ftp://invalid.example.com',
      }),
    ).toEqual(['http://localhost:3000'])
  })

  it('local allowlist未設定時はlocalhostとloopbackを許可する', () => {
    expect(resolvePayloadAllowedOrigins({})).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ])
  })
})
