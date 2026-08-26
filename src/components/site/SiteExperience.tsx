'use client'

import { useEffect, useRef, useState } from 'react'

const navigation = [
  ['HOME', '#top'],
  ['ABOUT', '#about'],
  ['WORKS', '#works'],
  ['BLOG', '#writing'],
  ['NEWS', '#activity'],
  ['SCHEDULE', '#schedule'],
  ['CONTACT', '#contact'],
] as const

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem('ivmz-theme', theme)
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
    setTheme(current)
  }, [])

  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      type="button"
      aria-label={`テーマを${next === 'light' ? 'ライト' : 'ダーク'}へ切り替える`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
    >
      <span aria-hidden="true" className="theme-toggle-mark">
        {theme === 'dark' ? '☾' : '☼'}
      </span>
      {!compact && <span>{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>}
    </button>
  )
}

export function SignatureIntro() {
  const [skip, setSkip] = useState(false)

  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem('ivmz-signature-seen') === '1'
      setSkip(seen)
      window.sessionStorage.setItem('ivmz-signature-seen', '1')
    } catch {
      setSkip(false)
    }
  }, [])

  return (
    <div className={`signature-intro${skip ? ' signature-intro-skip' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 220 76" role="presentation">
        <path
          className="signature-path"
          d="M12 54 C28 17 35 22 31 52 C29 69 46 63 57 42 C71 15 65 62 80 58 C95 54 102 29 106 24 C106 44 101 64 119 57 C137 50 140 24 151 22 C158 29 145 58 165 56 C184 55 194 42 207 28"
        />
        <path className="signature-slash" d="M158 66 L208 66" />
      </svg>
      <span>ivmz / signal</span>
    </div>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const drawer = drawerRef.current
    const focusables = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    focusables?.[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab' || !focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const closeDrawer = () => setOpen(false)

  return (
    <>
      <header className="signal-header" aria-label="Primary navigation">
        <div className="desktop-nav-shell">
          <a className="brand-mark" href="#top" aria-label="ivmz home" aria-current="page">
            <span className="brand-glyph" aria-hidden="true">
              i/
            </span>
            <span className="brand-word">ivmz</span>
          </a>
          <nav className="desktop-nav" aria-label="Desktop navigation">
            {navigation.map(([label, href]) => (
              <a key={label} href={href} aria-current={label === 'HOME' ? 'page' : undefined}>
                {label}
              </a>
            ))}
            <span className="nav-coming" aria-disabled="true" title="Coming Soon">
              STORE <small>SOON</small>
            </span>
          </nav>
          <ThemeToggle compact />
        </div>

        <div className="mobile-nav-shell">
          <a className="brand-mark" href="#top" aria-label="ivmz home" aria-current="page">
            <span className="brand-glyph" aria-hidden="true">
              i/
            </span>
            <span className="brand-word">ivmz</span>
          </a>
          <div className="mobile-actions">
            <ThemeToggle compact />
            <button
              ref={triggerRef}
              className="menu-trigger"
              type="button"
              aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen((value) => !value)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`drawer-backdrop${open ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={closeDrawer}
      />
      <div
        ref={drawerRef}
        id="mobile-navigation"
        className={`mobile-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
      >
        <div className="drawer-topline">
          <span>NAV / 001</span>
          <button
            type="button"
            onClick={() => {
              closeDrawer()
              triggerRef.current?.focus()
            }}
            aria-label="メニューを閉じる"
          >
            CLOSE
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {navigation.map(([label, href], index) => (
            <a key={label} href={href} onClick={closeDrawer} tabIndex={open ? 0 : -1}>
              <span>0{index + 1}</span>
              {label}
            </a>
          ))}
          <span className="drawer-coming">
            <span>08</span>
            STORE <small>COMING SOON</small>
          </span>
        </nav>
        <p>
          いゔる。 a.k.a. mizzz（ずーみー）
          <br />
          Personal Web Platform
        </p>
      </div>
    </>
  )
}

export function HeroPointerSignal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const handlePointer = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      element.style.setProperty('--pointer-x', x.toFixed(3))
      element.style.setProperty('--pointer-y', y.toFixed(3))
    }
    const reset = () => {
      element.style.setProperty('--pointer-x', '0')
      element.style.setProperty('--pointer-y', '0')
    }
    element.addEventListener('pointermove', handlePointer)
    element.addEventListener('pointerleave', reset)
    return () => {
      element.removeEventListener('pointermove', handlePointer)
      element.removeEventListener('pointerleave', reset)
    }
  }, [])

  return <div ref={ref} className="hero-pointer-layer" aria-hidden="true" />
}
