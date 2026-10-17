import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  allowChatRequest,
  CHAT_DAILY_LIMIT,
  CHAT_IP_LIMIT,
  resetChatLimitsForTests,
} from './limits'
import { askLlm, buildSystemPrompt, cleanReply, parseChatTurns, readLlmConfig } from './llm'

const config = { accountId: 'a'.repeat(32), apiToken: 'sekret-9f3', models: ['@cf/test/model'] }

const req = (ip: string) =>
  new Request('https://x.test', { headers: { 'x-nf-client-connection-ip': ip } })

describe('readLlmConfig', () => {
  it('is off unless both values are set and CHAT_LLM is not off', () => {
    expect(readLlmConfig({} as NodeJS.ProcessEnv)).toBeNull()
    expect(
      readLlmConfig({ CHAT_LLM_ACCOUNT_ID: 'a'.repeat(32) } as unknown as NodeJS.ProcessEnv),
    ).toBeNull()
    const env = { CHAT_LLM_ACCOUNT_ID: 'a'.repeat(32), CHAT_LLM_API_TOKEN: 't' }
    expect(readLlmConfig(env as unknown as NodeJS.ProcessEnv)?.models[0]).toContain('glm')
    expect(readLlmConfig({ ...env, CHAT_LLM: 'off' } as unknown as NodeJS.ProcessEnv)).toBeNull()
    expect(
      readLlmConfig({ ...env, CHAT_LLM_MODEL: '@cf/pinned/m' } as unknown as NodeJS.ProcessEnv)
        ?.models,
    ).toEqual(['@cf/pinned/m'])
    expect(
      readLlmConfig({ ...env, CHAT_LLM_ACCOUNT_ID: '../x' } as unknown as NodeJS.ProcessEnv),
    ).toBeNull()
  })
})

describe('parseChatTurns', () => {
  it('accepts bounded user/assistant text ending with a user turn', () => {
    const turns = parseChatTurns([
      { content: 'こんにちは', role: 'assistant' },
      { content: 'あ'.repeat(500), role: 'user' },
    ])
    expect(turns?.[1].content).toHaveLength(300)
  })
  it('keeps only the latest turns', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ content: `q${i}`, role: 'user' }))
    expect(parseChatTurns(many)).toHaveLength(6)
  })
  it.each([
    [null],
    [[]],
    [[{ content: 'x', role: 'system' }]],
    [[{ content: 1, role: 'user' }]],
    [[{ content: 'x', role: 'assistant' }]],
    [['x']],
  ])('rejects %j', (input) => {
    expect(parseChatTurns(input)).toBeNull()
  })
})

describe('prompt and reply', () => {
  it('grounds the prompt in the FAQ and forbids guessing', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('お問い合わせフォーム')
    expect(prompt).toContain('推測せず')
  })
  it('strips markup and bounds the reply', () => {
    expect(cleanReply('**太字** <script>alert(1)</script> `code`')).toBe('太字 alert(1) code')
    expect(cleanReply('a'.repeat(2000))).toHaveLength(700)
  })
})

describe('askLlm', () => {
  it('returns the cleaned reply and sends no secrets in the body', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(String(init?.body)).not.toContain('sekret-9f3')
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sekret-9f3')
      return Response.json({ result: { response: 'ご相談は **フォーム** から。' } })
    }) as unknown as typeof fetch
    expect(await askLlm([{ content: '相談したい', role: 'user' }], config, fetcher)).toBe(
      'ご相談は フォーム から。',
    )
  })
  it('falls through retired models and reads the OpenAI-style answer', async () => {
    const calls: string[] = []
    const fetcher = vi.fn(async (url: unknown) => {
      calls.push(String(url))
      if (calls.length === 1) return new Response('gone', { status: 404 })
      return Response.json({ result: { choices: [{ message: { content: 'こんにちは' } }] } })
    }) as unknown as typeof fetch
    const reply = await askLlm(
      [{ content: 'x', role: 'user' }],
      { ...config, models: ['@cf/old/model', '@cf/new/model'] },
      fetcher,
    )
    expect(reply).toBe('こんにちは')
    expect(calls[0]).toContain('@cf/old/model')
    expect(calls[1]).toContain('@cf/new/model')
  })
  it('falls through a model-capacity 429 but stops on account quota', async () => {
    const capacity = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ errors: [{ code: 3040 }] }, { status: 429 }))
      .mockResolvedValueOnce(
        Response.json({ result: { response: 'ok' } }),
      ) as unknown as typeof fetch
    expect(
      await askLlm([{ content: 'x', role: 'user' }], { ...config, models: ['a', 'b'] }, capacity),
    ).toBe('ok')
    expect(capacity).toHaveBeenCalledTimes(2)

    const quota = vi.fn(async () =>
      Response.json({ errors: [{ code: 3036 }] }, { status: 429 }),
    ) as unknown as typeof fetch
    expect(
      await askLlm([{ content: 'x', role: 'user' }], { ...config, models: ['a', 'b'] }, quota),
    ).toBeNull()
    expect(quota).toHaveBeenCalledTimes(1)
  })
  it('tries the next model after a provider timeout or network failure', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('provider unreachable'))
      .mockResolvedValueOnce(
        Response.json({ result: { response: 'FAQでご案内します' } }),
      ) as unknown as typeof fetch

    const reply = await askLlm(
      [{ content: '質問です', role: 'user' }],
      { ...config, models: ['@cf/slow', '@cf/backup'] },
      fetcher,
    )
    expect(reply).toBe('FAQでご案内します')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not try other models on quota errors', async () => {
    const fetcher = vi.fn(
      async () => new Response('quota', { status: 429 }),
    ) as unknown as typeof fetch
    expect(
      await askLlm([{ content: 'x', role: 'user' }], { ...config, models: ['a', 'b'] }, fetcher),
    ).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([
    ['non-2xx', async () => new Response('x', { status: 429 })],
    ['network error', async () => Promise.reject(new Error('down'))],
    ['bad shape', async () => Response.json({ result: {} })],
    ['empty', async () => Response.json({ result: { response: '  ' } })],
  ])('returns null on %s', async (_name, impl) => {
    expect(
      await askLlm([{ content: 'x', role: 'user' }], config, impl as unknown as typeof fetch),
    ).toBeNull()
  })
})

describe('allowChatRequest', () => {
  beforeEach(resetChatLimitsForTests)
  afterEach(resetChatLimitsForTests)
  it('limits one visitor, then everyone for the day', () => {
    for (let i = 0; i < CHAT_IP_LIMIT; i += 1) expect(allowChatRequest(req('1.1.1.1'))).toBe('ok')
    expect(allowChatRequest(req('1.1.1.1'))).toBe('visitor')
    // Over-limit requests from one visitor do not use up the shared daily allowance.
    for (let i = 0; i < 500; i += 1) allowChatRequest(req('1.1.1.1'))
    expect(allowChatRequest(req('4.4.4.4'))).toBe('ok')

    resetChatLimitsForTests()
    for (let i = 0; i < CHAT_DAILY_LIMIT; i += 1) allowChatRequest(req(`9.9.${i}.1`))
    expect(allowChatRequest(req('2.2.2.2'))).toBe('daily')
    // Thousands of distinct visitors must not evict the shared counter and unlock more calls.
    for (let i = 0; i < 2_500; i += 1)
      allowChatRequest(req(`7.${i % 250}.${Math.floor(i / 250)}.1`))
    expect(allowChatRequest(req('8.8.8.8'))).toBe('daily')
  })
})
