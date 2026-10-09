'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const navigation = [
  ['HOME', '/'],
  ['ABOUT', '/about'],
  ['WORKS', '/works'],
  ['BLOG', '/blog'],
  ['NEWS', '/news'],
  ['SCHEDULE', '/schedule'],
  ['CONTACT', '/contact'],
] as const

type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem('ivmz-theme', theme)
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
      type="button"
      aria-label="テーマを切り替える"
      title="Switch color theme"
      onClick={() => {
        const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
        applyTheme(current === 'dark' ? 'light' : 'dark')
      }}
    >
      <span aria-hidden="true" className="theme-toggle-mark theme-mark-dark">
        ☾
      </span>
      <span aria-hidden="true" className="theme-toggle-mark theme-mark-light">
        ☼
      </span>
      {!compact && <span className="theme-toggle-label">THEME</span>}
    </button>
  )
}

/** Single-stroke "ivmz" signature, drawn once per session. Visual only (aria-hidden, no pointer events). */
export const SIGNATURE_PATH =
  'M16 82 C20 66 24 54 27 46 C28 42 26 44 25 56 C24 68 29 80 41 68 C47 58 51 52 55 54 C59 56 55 70 61 78 C65 72 75 54 81 52 C85 52 83 64 85 72 C87 58 95 50 101 54 C105 58 101 70 103 74 C105 60 113 50 119 54 C123 58 119 72 125 76 C131 70 135 56 139 52 C149 48 161 50 151 60 C141 70 127 84 141 84 C153 84 165 72 178 60'

export function SignatureIntro() {
  return (
    <div className="signature-intro" aria-hidden="true">
      <div className="signature-intro-grid" />
      <svg viewBox="0 18 210 92" role="presentation">
        <path className="signature-path" d={SIGNATURE_PATH} pathLength={1} />
        <path className="signature-dot" d="M27 28 L29 26" pathLength={1} />
        <path className="signature-slash" d="M10 98 C60 90 120 102 196 92" pathLength={1} />
        <circle className="signature-pen" cx="0" cy="0" r="3.4" />
      </svg>
      <span>ivmz / signal</span>
      <i className="signature-meter" />
    </div>
  )
}

const extraRouteLabels = [
  ['/links', 'LINKS'],
  ['/legal/privacy', 'PRIVACY'],
  ['/legal/terms', 'TERMS'],
] as const

/** Label shown in the header pill: the current section name, or the brand on Home / unknown routes. */
function currentRouteLabel(pathname: string): string | null {
  const match = [...navigation, ...extraRouteLabels].find(
    ([, href]) => href !== '/' && isCurrentRoute(pathname, href),
  )
  return match ? match[0] : null
}

function isCurrentRoute(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
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
  const homeCurrent = pathname === '/'
  const routeLabel = currentRouteLabel(pathname)
  const brandLabel = `ivmz home${routeLabel ? `, current page: ${routeLabel}` : ''}`

  return (
    <>
      <header className="signal-header" aria-label="Primary navigation">
        <div className="desktop-nav-shell">
          <a
            className="brand-mark"
            href="/"
            aria-label={brandLabel}
            aria-current={homeCurrent ? 'page' : undefined}
          >
            <span className="brand-glyph" aria-hidden="true">
              i/
            </span>
            <span
              key={routeLabel ?? 'ivmz'}
              className={`brand-word${routeLabel ? ' brand-word-route' : ''}`}
            >
              {routeLabel ?? 'ivmz'}
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Desktop navigation">
            {navigation.map(([label, href]) => (
              <a
                key={label}
                href={href}
                aria-current={isCurrentRoute(pathname, href) ? 'page' : undefined}
              >
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
          <a
            className="brand-mark"
            href="/"
            aria-label={brandLabel}
            aria-current={homeCurrent ? 'page' : undefined}
            onClick={closeDrawer}
          >
            <span className="brand-glyph" aria-hidden="true">
              i/
            </span>
            <span
              key={routeLabel ?? 'ivmz'}
              className={`brand-word${routeLabel ? ' brand-word-route' : ''}`}
            >
              {routeLabel ?? 'ivmz'}
            </span>
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
            <a
              key={label}
              href={href}
              onClick={closeDrawer}
              tabIndex={open ? 0 : -1}
              aria-current={isCurrentRoute(pathname, href) ? 'page' : undefined}
            >
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
