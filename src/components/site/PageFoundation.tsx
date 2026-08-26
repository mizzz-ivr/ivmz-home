import Link from 'next/link'
import type { ReactNode } from 'react'

type PageHeroProps = {
  index: string
  title: ReactNode
  description: ReactNode
  signal?: string
}

export function PageHero({ index, title, description, signal }: PageHeroProps) {
  return (
    <header className="page-hero">
      <div className="page-hero-copy">
        <p className="signal-label">{index}</p>
        <h1>{title}</h1>
        <div className="page-lede">{description}</div>
      </div>
      <div className="page-hero-signal" aria-hidden="true">
        <span>{signal ?? 'IVMZ / ROUTE'}</span>
        <i />
        <b>+</b>
      </div>
    </header>
  )
}

type PageSectionProps = {
  title: string
  description?: ReactNode
  children: ReactNode
}

export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <section className="page-section" aria-labelledby={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <div className="page-section-heading">
        <h2 id={`section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{title}</h2>
        {description && <div>{description}</div>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state" role="status">
      <span aria-hidden="true">//</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

export function PageCTA({
  title,
  body,
  href,
  label,
}: {
  title: string
  body: ReactNode
  href: string
  label: string
}) {
  return (
    <aside className="page-cta">
      <div>
        <span>IVMZ / NEXT SIGNAL</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <Link className="action-link action-primary" href={href}>
        {label} <span aria-hidden="true">→</span>
      </Link>
    </aside>
  )
}

export function LegalLayout({ children }: { children: ReactNode }) {
  return <div className="legal-layout">{children}</div>
}
