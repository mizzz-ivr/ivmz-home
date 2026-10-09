import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const previewOrigin = 'https://deploy-preview-46--ivmz-home.netlify.app'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    category: 'personal',
    email: 'visitor@example.com',
    message: 'Hello from the contact form.',
    name: 'Visitor',
    subject: 'Hello',
    website: '',
    ...overrides,
  }
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${previewOrigin}/api/contact`, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Origin: previewOrigin,
      ...headers,
    },
    method: 'POST',
  })
}

function usePreviewEnvironment() {
  vi.stubEnv('PAYLOAD_BUILD_CONTEXT', 'deploy-preview')
  vi.stubEnv('PAYLOAD_BUILD_ORIGIN', previewOrigin)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/contact', () => {
  it('accepts a valid Deploy Preview submission without real delivery', async () => {
    usePreviewEnvironment()

    const response = await POST(request(validBody()))
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload).toMatchObject({
      mode: 'preview',
      ok: true,
    })
    expect(payload.requestId).toEqual(expect.any(String))
  })

  it('rejects requests from another origin', async () => {
    usePreviewEnvironment()

    const response = await POST(
      request(validBody(), {
        Origin: 'https://attacker.invalid',
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'forbidden_origin',
      ok: false,
    })
  })

  it('rejects malformed submissions server-side', async () => {
    usePreviewEnvironment()

    const response = await POST(request(validBody({ email: 'not-an-email' })))
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload).toMatchObject({
      code: 'validation_error',
      errors: {
        email: '有効なメールアドレスを入力してください。',
      },
      ok: false,
    })
  })

  it('rejects oversized request bodies', async () => {
    usePreviewEnvironment()

    const response = await POST(
      request(
        validBody({
          message: 'a'.repeat(20_000),
        }),
      ),
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      code: 'payload_too_large',
      ok: false,
    })
  })

  it('requires a valid Turnstile token once a secret is configured', async () => {
    usePreviewEnvironment()
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')

    const missing = await POST(request(validBody()))
    expect(missing.status).toBe(403)
    expect(await missing.json()).toMatchObject({ code: 'captcha_failed', ok: false })

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"success":true}', { status: 200 }))
    const accepted = await POST(request(validBody({ turnstileToken: 'good' })))
    expect(accepted.status).toBe(202)
    fetchMock.mockRestore()
  })

  it('does not spend the token on validation errors', async () => {
    usePreviewEnvironment()
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const response = await POST(request(validBody({ email: 'not-an-email' })))
    expect(response.status).toBe(422)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it('absorbs honeypot submissions without invoking real delivery', async () => {
    usePreviewEnvironment()

    const response = await POST(
      request(
        validBody({
          website: 'https://bot.example',
        }),
      ),
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
