'use client'

import { useEffect, useState } from 'react'

/**
 * Hero terminal (Issue #176, UI mock v1). Progressive enhancement: the full
 * script is rendered on the server and stays readable without JS or with
 * reduced motion; the typing replay only runs when motion is allowed.
 * The last line is a live JST clock.
 */
const SCRIPT = [
  { command: 'whoami', output: 'いゔる。 a.k.a. mizzz（ずーみー）' },
  { command: 'cat ./now.txt', output: 'BUILD SMALL · POLISH FAST · OPERATE SAFELY' },
] as const

const clockFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

type Typing = { line: number; chars: number; typing: boolean }

export function HeroTerminal() {
  const [state, setState] = useState<Typing>({ line: SCRIPT.length, chars: 0, typing: false })
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(clockFormat.format(new Date()))
    tick()
    const clockId = window.setInterval(tick, 1000)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => window.clearInterval(clockId)
    }

    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms))
      })
    const run = async () => {
      setState({ line: 0, chars: 0, typing: true })
      await wait(500)
      for (let line = 0; line < SCRIPT.length; line++) {
        for (let chars = 1; chars <= SCRIPT[line].command.length; chars++) {
          if (cancelled) return
          setState({ line, chars, typing: true })
          await wait(36)
        }
        await wait(260)
        if (cancelled) return
        setState({ line: line + 1, chars: 0, typing: true })
        await wait(340)
      }
      if (!cancelled) setState({ line: SCRIPT.length, chars: 0, typing: false })
    }
    void run()
    return () => {
      cancelled = true
      timers.forEach((id) => window.clearTimeout(id))
      window.clearInterval(clockId)
    }
  }, [])

  return (
    <div
      className="hero-terminal"
      role="img"
      aria-label="ターミナル風プロフィール。いゔる。 a.k.a. mizzz（ずーみー）。現在のフォーカスは BUILD SMALL、POLISH FAST、OPERATE SAFELY。"
    >
      <div className="terminal-bar" aria-hidden="true">
        <span className="terminal-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="terminal-title">ivmz — terminal</span>
        <span className="terminal-live">
          <i />
          JST {clock ? clock.slice(-8) : '--:--:--'}
        </span>
      </div>
      <div className="terminal-body" aria-hidden="true">
        {SCRIPT.map((entry, index) => {
          if (state.typing && index > state.line) return null
          const isTypingLine = state.typing && index === state.line
          const command = isTypingLine ? entry.command.slice(0, state.chars) : entry.command
          const showOutput = !state.typing || index < state.line
          return (
            <div className="terminal-entry" key={entry.command}>
              <p className="terminal-line">
                <span className="terminal-prompt">$</span> {command}
                {isTypingLine ? <span className="terminal-caret" /> : null}
              </p>
              {showOutput ? <p className="terminal-output">{entry.output}</p> : null}
            </div>
          )
        })}
        {!state.typing ? (
          <>
            <p className="terminal-line">
              <span className="terminal-prompt">$</span> date
            </p>
            <p className="terminal-output terminal-clock">{clock || '—'} JST</p>
            <p className="terminal-line">
              <span className="terminal-prompt">$</span> <span className="terminal-caret" />
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
