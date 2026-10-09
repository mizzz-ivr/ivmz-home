import { describe, expect, it } from 'vitest'

import { isAllowedContactOrigin, resolveContactAllowedOrigins } from './contact-origin'

describe('contact origin boundary', () => {
  it('allows only the canonical Production origin', () => {
    const env = {
      PAYLOAD_BUILD_CONTEXT: 'production',
      PAYLOAD_BUILD_ORIGIN: 'https://unexpected.example.com',
    }

    expect(resolveContactAllowedOrigins(env)).toEqual(['https://ivmz.ivrm.jp'])
    expect(isAllowedContactOrigin('https://ivmz.ivrm.jp', env)).toBe(true)
    expect(isAllowedContactOrigin('https://attacker.invalid', env)).toBe(false)
  })

  it('uses the exact Deploy Preview origin', () => {
    const env = {
      PAYLOAD_BUILD_CONTEXT: 'deploy-preview',
      PAYLOAD_BUILD_ORIGIN: 'https://deploy-preview-50--ivmz-home.netlify.app/path',
    }

    expect(resolveContactAllowedOrigins(env)).toEqual([
      'https://deploy-preview-50--ivmz-home.netlify.app',
    ])
  })

  it('fails closed when Preview origin metadata is invalid', () => {
    expect(
      resolveContactAllowedOrigins({
        PAYLOAD_BUILD_CONTEXT: 'deploy-preview',
        PAYLOAD_BUILD_ORIGIN: 'not-a-url',
      }),
    ).toEqual([])
  })

  it('rejects missing Origin headers', () => {
    expect(isAllowedContactOrigin(null, {})).toBe(false)
  })
})
