const footerNavigation = [
  ['HOME', '/'],
  ['ABOUT', '/about'],
  ['WORKS', '/works'],
  ['BLOG', '/blog'],
  ['NEWS', '/news'],
  ['SCHEDULE', '/schedule'],
  ['CONTACT', '/contact'],
  ['LINKS', '/links'],
] as const

export function SiteFooter() {
  return (
    <footer className="global-site-footer" aria-label="Site footer">
      <div className="global-site-footer-inner">
        <div className="footer-identity">
          <span>IVMZ / PERSONAL WEB PLATFORM</span>
          <strong>
            Build small.
            <br />
            Keep the signal clear.
          </strong>
          <p>いゔる。 a.k.a. mizzz（ずーみー）</p>
        </div>

        <nav className="footer-navigation" aria-label="Footer navigation">
          {footerNavigation.map(([label, href], index) => (
            <a href={href} key={href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </a>
          ))}
        </nav>

        <div className="footer-meta">
          <span>© 2026 ivmz</span>
          <span>Canonical / ivmz.ivrm.jp</span>
          <span className="footer-legal-links">
            <a href="/legal/privacy">PRIVACY</a>
            <span aria-hidden="true"> / </span>
            <a href="/legal/terms">TERMS</a>
          </span>
          <a href="#main-content">BACK TO TOP ↑</a>
        </div>
      </div>
    </footer>
  )
}
