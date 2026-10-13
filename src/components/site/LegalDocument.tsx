import type { ReactNode } from 'react'

export type LegalSection = {
  id: string
  title: string
  body: ReactNode
}

type LegalDocumentProps = {
  enacted: string
  revised: string
  intro: ReactNode
  sections: readonly LegalSection[]
}

/** Numbered legal text with a table of contents; every section gets a stable anchor. */
export function LegalDocument({ enacted, revised, intro, sections }: LegalDocumentProps) {
  return (
    <div className="legal-layout legal-document">
      <dl className="legal-meta">
        <div>
          <dt>制定日</dt>
          <dd>{enacted}</dd>
        </div>
        <div>
          <dt>最終改定日</dt>
          <dd>{revised}</dd>
        </div>
      </dl>

      <div className="legal-intro">{intro}</div>

      <nav className="legal-toc" aria-label="目次">
        <p>目次</p>
        <ol>
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {section.title}
          </h2>
          {section.body}
        </section>
      ))}
    </div>
  )
}

export function LegalTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: readonly string[]
  rows: readonly (readonly ReactNode[])[]
}) {
  return (
    <div className="legal-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="legal-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
