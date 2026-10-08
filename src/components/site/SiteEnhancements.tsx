'use client'

import { useEffect, useState } from 'react'

/**
 * Progressive enhancement only. Every piece of primary content is already SSR/DOM and visible
 * without this component; it adds scroll progress, reveal-on-scroll and a pointer spotlight.
 */
export function SiteEnhancements() {
  useEffect(() => {
    const root = document.documentElement
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll progress (CSS custom property, painted by .scroll-progress).
    let frame = 0
    const updateProgress = () => {
      frame = 0
      const max = root.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      root.style.setProperty('--scroll-progress', ratio.toFixed(4))
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    // Reveal on scroll. Elements already in view are marked before the gating class is added,
    // so nothing above the fold ever flashes hidden.
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    let observer: IntersectionObserver | undefined
    if (!reduceMotion && 'IntersectionObserver' in window && targets.length > 0) {
      const viewport = window.innerHeight
      for (const element of targets) {
        if (element.getBoundingClientRect().top < viewport * 0.92) {
          element.classList.add('is-revealed')
        }
      }
      root.classList.add('reveal-ready')
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            entry.target.classList.add('is-revealed')
            observer?.unobserve(entry.target)
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      )
      for (const element of targets) {
        if (!element.classList.contains('is-revealed')) observer.observe(element)
      }
    }

    // Pointer spotlight on [data-spotlight] surfaces (fine pointers only).
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const onPointerMove = (event: PointerEvent) => {
      const surface = (event.target as Element | null)?.closest<HTMLElement>('[data-spotlight]')
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      surface.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
      surface.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
    }
    if (finePointer && !reduceMotion) {
      document.addEventListener('pointermove', onPointerMove, { passive: true })
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('pointermove', onPointerMove)
      if (frame) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])

  return <div className="scroll-progress" aria-hidden="true" />
}

type SectionIndexItem = { id: string; label: string }

/** Fixed dot index for long single-page scrolls (desktop only, hidden by CSS below 1180px). */
export function SectionIndex({ items }: { items: readonly SectionIndexItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null)
    if (sections.length === 0 || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [items])

  return (
    <nav className="section-index" aria-label="ページ内セクション">
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined}>
              <span className="section-index-label">{item.label}</span>
              <i aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Auto-moving tool list with a keyboard/touch accessible pause control (WCAG 2.2.2). */
export function ToolboxMarquee({ tools }: { tools: readonly string[] }) {
  const [paused, setPaused] = useState(false)

  return (
    <div className={`toolbox-marquee${paused ? ' is-paused' : ''}`}>
      <div className="toolbox-viewport" role="group" aria-label="主なツールと技術">
        <ul className="toolbox-track">
          {tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
        <ul className="toolbox-track" aria-hidden="true">
          {tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </div>
      <button
        className="toolbox-pause"
        type="button"
        aria-pressed={paused}
        aria-label={paused ? '流れる表示を再生する' : '流れる表示を一時停止する'}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
      </button>
    </div>
  )
}
