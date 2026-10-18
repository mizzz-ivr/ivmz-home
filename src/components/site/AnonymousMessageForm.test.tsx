// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AnonymousMessageForm } from './AnonymousMessageForm'

vi.mock('./TurnstileWidget', () => ({
  TurnstileWidget: ({ onToken }: { onToken: (value: string) => void }) => (
    <button type="button" onClick={() => onToken('captcha-token')}>
      ボット確認テスト
    </button>
  ),
}))

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
  vi.stubGlobal('crypto', { randomUUID: () => '3f2b8f0e-1c52-4c1e-9b8a-6a1d2e5f7c90' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AnonymousMessageForm', () => {
  it('counts Unicode graphemes and rejects more than 300', () => {
    render(<AnonymousMessageForm siteKey="test-site" />)
    const textarea = screen.getByRole('textbox', { name: 'メッセージ（匿名）' })
    fireEvent.change(textarea, { target: { value: '👨‍👩‍👧‍👦'.repeat(301) } })
    expect(screen.getByText('301 / 300文字')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '内容を確認する ↗' }).hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.change(textarea, { target: { value: 'ありがとうございます' } })
    expect(screen.getByText('10 / 300文字')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '内容を確認する ↗' }).hasAttribute('disabled'),
    ).toBe(false)
  })

  it('preserves text across server errors and never submits before Turnstile token', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ ok: false, code: 'rate_limited' }, { status: 429 }),
    )
    render(<AnonymousMessageForm siteKey="test-site" />)
    fireEvent.change(screen.getByRole('textbox', { name: 'メッセージ（匿名）' }), {
      target: { value: 'メッセージ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '内容を確認する ↗' }))
    const submit = screen.getByRole('button', { name: '匿名で送信する →' })
    expect(submit.hasAttribute('disabled')).toBe(true)
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'ボット確認テスト' }))
    fireEvent.click(submit)
    expect(await screen.findByText(/送信回数の上限に達しました/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '← 修正する' }))
    expect(
      (screen.getByRole('textbox', { name: 'メッセージ（匿名）' }) as HTMLTextAreaElement).value,
    ).toBe('メッセージ')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('confirms receipt without claiming it was published', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ ok: true, code: 'received' }, { status: 201 }),
    )
    render(<AnonymousMessageForm siteKey="test-site" />)
    fireEvent.change(screen.getByRole('textbox', { name: 'メッセージ（匿名）' }), {
      target: { value: 'hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: '内容を確認する ↗' }))
    fireEvent.click(screen.getByRole('button', { name: 'ボット確認テスト' }))
    fireEvent.click(screen.getByRole('button', { name: '匿名で送信する →' }))
    expect(await screen.findByText('受け付けました！')).toBeTruthy()
    expect(screen.getByText(/公開や返信は保証していません/)).toBeTruthy()
  })
})
