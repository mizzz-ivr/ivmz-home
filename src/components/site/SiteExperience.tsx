'use client'

import Link from 'next/link'
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

export function SignatureIntro() {
  return (
    <div className="signature-intro" aria-hidden="true">
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

  return (
    <>
      <header className="signal-header" aria-label="Primary navigation">
        <div className="desktop-nav-shell">
          <Link className="brand-mark" href="/" aria-label="ivmz home" aria-current={homeCurrent ? 'page' : undefined}>
            <span className="brand-glyph" aria-hidden="true">i/</span>
            <span className="brand-word">ivmz</span>
          </Link>
          <nav className="desktop-nav" aria-label="Desktop navigation">
            {navigation.map(([label, href]) => (
              <Link key={label} href={href} aria-current={isCurrentRoute(pathname, href) ? 'page' : undefined}>
                {label}
              </Link>
            ))}
            <span className="nav-coming" aria-disabled="true" title="Coming Soon">
              STORE <small>SOON</small>
            </span>
          </nav>
          <ThemeToggle compact />
        </div>

        <div className="mobile-nav-shell">
          <Link className="brand-mark" href="/" aria-label="ivmz home" aria-current={homeCurrent ? 'page' : undefined} onClick={closeDrawer}>
            <span className="brand-glyph" aria-hidden="true">i/</span>
            <span className="brand-word">ivmz</span>
          </Link>
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

      <div className={`drawer-backdrop${open ? ' is-open' : ''}`} aria-hidden="true" onClick={closeDrawer} />
      <div ref={drawerRef} id="mobile-navigation" className={`mobile-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="drawer-topline">
          <span>NAV / 001</span>
          <button type="button" onClick={() => { closeDrawer(); triggerRef.current?.focus() }} aria-label="メニューを閉じる">
            CLOSE
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {navigation.map(([label, href], index) => (
            <Link key={label} href={href} onClick={closeDrawer} tabIndex={open ? 0 : -1} aria-current={isCurrentRoute(pathname, href) ? 'page' : undefined}>
              <span>0{index + 1}</span>
              {label}
            </Link>
          ))}
          <span className="drawer-coming"><span>08</span>STORE <small>COMING SOON</small></span>
        </nav>
        <p>いゔる。 a.k.a. mizzz（ずーみー）<br />Personal Web Platform</p>
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
