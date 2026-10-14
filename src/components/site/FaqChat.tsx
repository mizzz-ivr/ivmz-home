'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  chatFallback,
  chatGreeting,
  contactLink,
  findEntry,
  MAX_CHAT_INPUT,
  matchQuestion,
  topLevelQuestionIds,
  type FaqLink,
} from '@/lib/faq-content'
import { site } from '@/lib/site'

export const OPEN_CHAT_EVENT = 'ivmz:open-chat'

type Message = {
  id: number
  role: 'bot' | 'user'
  text: readonly string[]
  link?: FaqLink
  /** Follow-up quick replies shown under the latest bot message. */
  suggestions?: readonly string[]
}

const isExternal = (href: string) => href.startsWith('https://')
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Opens the chat from anywhere on the page (the FAQ section uses this). */
export function ChatOpenButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="action-link action-primary"
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
    >
      {children}
    </button>
  )
}

export function FaqChat() {
  // Learned at runtime: the home page is static, so build-time env would not reflect the setup.
  const [aiEnabled, setAiEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const busy = useRef(false)
  const titleId = useId()

  const push = useCallback((message: Omit<Message, 'id'>) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ }])
  }, [])

  const openChat = useCallback(() => {
    setOpen(true)
    fetch('/api/chat', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { enabled?: unknown } | null) => setAiEnabled(data?.enabled === true))
      .catch(() => setAiEnabled(false))
    setMessages((current) =>
      current.length > 0
        ? current
        : [
            {
              id: nextId.current++,
              role: 'bot',
              suggestions: topLevelQuestionIds,
              text: chatGreeting,
            },
          ],
    )
  }, [])

  const closeChat = useCallback(() => setOpen(false), [])

  // Return focus to the launcher once it is visible again (it is hidden while the panel is open).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    window.addEventListener(OPEN_CHAT_EVENT, openChat)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openChat)
  }, [openChat])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChat()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, closeChat])

  useEffect(() => {
    const log = logRef.current
    if (!log) return
    log.scrollTo({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', top: log.scrollHeight })
  }, [messages, typing])

  const reply = useCallback(
    async (message: Omit<Message, 'id'>) => {
      setTyping(true)
      await wait(prefersReducedMotion() ? 0 : 520)
      setTyping(false)
      push(message)
    },
    [push],
  )

  const answerEntry = useCallback(
    (id: string) => {
      const entry = findEntry(id)
      if (!entry) return reply({ role: 'bot', text: chatFallback, link: contactLink })
      return reply({
        link: entry.link,
        role: 'bot',
        suggestions: [...entry.related, 'top'],
        text: entry.answer,
      })
    },
    [reply],
  )

  // Only the current question is sent. Earlier turns stay in the browser: they may have been
  // answered locally, which the notice and privacy policy describe as never leaving the device.
  const askAi = useCallback(async (question: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/chat', {
        body: JSON.stringify({ messages: [{ content: question, role: 'user' }] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return null
      const data = (await response.json()) as { reply?: unknown }
      return typeof data.reply === 'string' && data.reply.length > 0 ? data.reply : null
    } catch {
      return null
    }
  }, [])

  const send = useCallback(
    async (label: string, entryId?: string) => {
      if (busy.current) return
      const text = label.trim().slice(0, MAX_CHAT_INPUT)
      if (!text) return
      busy.current = true
      push({ role: 'user', text: [text] })
      setDraft('')

      try {
        if (entryId === 'top') {
          await reply({
            role: 'bot',
            suggestions: topLevelQuestionIds,
            text: ['他にも、こんな質問に答えられます。'],
          })
          return
        }
        const matched = entryId ? findEntry(entryId) : matchQuestion(text)
        if (matched) {
          await answerEntry(matched.id)
          return
        }
        if (aiEnabled) {
          setTyping(true)
          const answer = await askAi(text)
          setTyping(false)
          if (answer) {
            push({
              link: contactLink,
              role: 'bot',
              suggestions: topLevelQuestionIds,
              text: [answer],
            })
            return
          }
        }
        await reply({
          link: contactLink,
          role: 'bot',
          suggestions: topLevelQuestionIds,
          text: chatFallback,
        })
      } finally {
        busy.current = false
      }
    },
    [aiEnabled, answerEntry, askAi, push, reply],
  )

  const lastBotId = [...messages].reverse().find((item) => item.role === 'bot')?.id

  return (
    <>
      <button
        ref={launcherRef}
        className="chat-launcher"
        type="button"
        aria-expanded={open}
        aria-controls="faq-chat-panel"
        hidden={open}
        onClick={openChat}
      >
        <span className="chat-launcher-avatar" aria-hidden="true">
          <Image src={site.githubAvatarUrl} alt="" width={40} height={40} />
        </span>
        <span className="chat-launcher-label">質問する</span>
        <i className="chat-launcher-ring" aria-hidden="true" />
      </button>

      <section
        id="faq-chat-panel"
        className="chat-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <header className="chat-header">
          <span className="chat-avatar" aria-hidden="true">
            <Image src={site.githubAvatarUrl} alt="" width={44} height={44} />
          </span>
          <div>
            <h2 id={titleId}>FAQ Assistant</h2>
            <p>
              <i aria-hidden="true" />
              {aiEnabled ? 'FAQ + AI で回答します' : 'よくある質問にお答えします'}
            </p>
          </div>
          <button
            className="chat-close"
            type="button"
            aria-label="チャットを閉じる"
            onClick={closeChat}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="会話">
          {messages.map((message) => (
            <div className={`chat-row chat-row-${message.role}`} key={message.id}>
              <div className="chat-bubble">
                {message.text.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {message.link ? (
                  <a
                    className="chat-link"
                    href={message.link.href}
                    {...(isExternal(message.link.href)
                      ? { rel: 'noopener noreferrer', target: '_blank' }
                      : {})}
                  >
                    {message.link.label} <span aria-hidden="true">→</span>
                  </a>
                ) : null}
              </div>
              {message.role === 'bot' &&
              message.id === lastBotId &&
              message.suggestions &&
              !typing ? (
                <ul className="chat-suggestions" aria-label="質問の候補">
                  {message.suggestions.map((id, index) => {
                    const entry = id === 'top' ? null : findEntry(id)
                    if (id !== 'top' && !entry) return null
                    return (
                      <li key={id} style={{ '--i': index } as React.CSSProperties}>
                        <button
                          type="button"
                          onClick={() => void send(entry?.question ?? '他の質問を見る', id)}
                        >
                          {entry?.question ?? '他の質問を見る'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          ))}
          {typing ? (
            <div className="chat-row chat-row-bot" aria-hidden="true">
              <div className="chat-bubble chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault()
            void send(draft)
          }}
        >
          <label className="sr-only" htmlFor={`${titleId}-input`}>
            質問を入力
          </label>
          <input
            id={`${titleId}-input`}
            ref={inputRef}
            value={draft}
            maxLength={MAX_CHAT_INPUT}
            autoComplete="off"
            placeholder="質問を入力してください"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="送信" disabled={draft.trim().length === 0 || typing}>
            <span aria-hidden="true">↑</span>
          </button>
        </form>
        <p className="chat-note">
          {aiEnabled
            ? 'ボタンの質問はこの端末の中だけで処理されます。自由入力でFAQにない内容は、AI（Cloudflare Workers AI）に送って回答を作ります。送信内容は当サイトでは保存しません。個人情報は入力しないでください。'
            : '入力した内容はこの端末の中だけで処理され、送信も保存もされません。'}
        </p>
      </section>
    </>
  )
}
