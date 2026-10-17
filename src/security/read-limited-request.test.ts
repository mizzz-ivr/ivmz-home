import { describe, expect, it, vi } from 'vitest'

import { readLimitedRequestText } from './read-limited-request'

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/chat', {
    body,
    headers,
    method: 'POST',
  })
}

describe('readLimitedRequestText', () => {
  it('accepts a body exactly at the byte limit, including multibyte Unicode', async () => {
    expect(await readLimitedRequestText(request('あ'), 3)).toEqual({
      kind: 'ok',
      text: 'あ',
    })
    expect(await readLimitedRequestText(request('abcd'), 4)).toEqual({
      kind: 'ok',
      text: 'abcd',
    })
  })

  it('rejects an oversized declared content length without reading the body', async () => {
    const incoming = request('ok', { 'content-length': '99999' })
    await expect(readLimitedRequestText(incoming, 4)).resolves.toEqual({ kind: 'too_large' })
    expect(incoming.bodyUsed).toBe(false)
  })

  it('rejects an invalid content length or missing body', async () => {
    const invalidHeader = await readLimitedRequestText(
      request('ok', { 'content-length': '-1' }),
      4,
    )
    expect(invalidHeader).toEqual({ kind: 'invalid' })
    await expect(readLimitedRequestText(new Request('https://example.test'), 4)).resolves.toEqual({
      kind: 'invalid',
    })
  })

  it('does not trust a small declared length for a larger streamed payload', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          controller.enqueue(new TextEncoder().encode('abc'))
          controller.enqueue(new TextEncoder().encode('def'))
        },
        cancel,
      },
      { highWaterMark: 0 },
    )
    const options: RequestInit & { duplex: 'half' } = {
      body: stream,
      duplex: 'half',
      headers: { 'content-length': '1' },
      method: 'POST',
    }
    const incoming = new Request('https://example.test/api/chat', options)
    await expect(readLimitedRequestText(incoming, 4)).resolves.toEqual({ kind: 'too_large' })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('rejects malformed UTF-8 instead of silently changing its content', async () => {
    const invalidUtf8 = new Uint8Array([0xff, 0xfe])
    const incoming = new Request('https://example.test/api/chat', {
      body: invalidUtf8,
      method: 'POST',
    })
    await expect(readLimitedRequestText(incoming, 4)).resolves.toEqual({ kind: 'invalid' })
  })

  it('rejects a failed request stream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('bad stream'))
      },
    })
    const options: RequestInit & { duplex: 'half' } = {
      body: stream,
      duplex: 'half',
      method: 'POST',
    }
    await expect(
      readLimitedRequestText(new Request('https://example.test/api/chat', options), 4),
    ).resolves.toEqual({ kind: 'invalid' })
  })
})
