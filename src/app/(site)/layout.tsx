import type { Metadata } from 'next'
import '../globals.css'
import '../responsive-foundation.css'
import '../reduced-motion.css'
import { SignatureIntro, SiteHeader } from '@/components/site/SiteExperience'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s | ${site.shortName}`,
  },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: site.url,
    title: site.name,
    description: site.description,
    siteName: site.shortName,
  },
}

const themeBootScript = `(() => {
  try {
    const saved = localStorage.getItem('ivmz-theme');
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
  try {
    const seen = sessionStorage.getItem('ivmz-signature-seen') === '1';
    if (seen) document.documentElement.classList.add('ivmz-signature-seen');
    else sessionStorage.setItem('ivmz-signature-seen', '1');
  } catch (_) {}
})();`

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          本文へスキップ
        </a>
        <SignatureIntro />
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
