import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const publicSiteRoot = resolve(root, 'src/app/(site)')
const siteComponentsRoot = resolve(root, 'src/components/site')

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    if (statSync(path).isDirectory()) return collectTsxFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

describe('public site shell', () => {
  it('keeps public route navigation on native document links', () => {
    const files = [...collectTsxFiles(publicSiteRoot), ...collectTsxFiles(siteComponentsRoot)]

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, `${file} must not use next/link`).not.toContain("from 'next/link'")
      expect(source, `${file} must not use next/link`).not.toContain('from "next/link"')
    }
  })

  it('keeps the intentional native-link lint exception scoped to the public site', () => {
    const eslintConfig = readFileSync(resolve(root, 'eslint.config.mjs'), 'utf8')

    expect(eslintConfig).toContain("'src/app/(site)/**/*.tsx'")
    expect(eslintConfig).toContain("'src/components/site/**/*.tsx'")
    expect(eslintConfig).toContain("'@next/next/no-html-link-for-pages': 'off'")
  })

  it('renders the shared footer from the public site layout', () => {
    const layout = readFileSync(resolve(publicSiteRoot, 'layout.tsx'), 'utf8')
    const home = readFileSync(resolve(publicSiteRoot, 'page.tsx'), 'utf8')

    expect(layout).toContain("import { SiteFooter } from '@/components/site/SiteFooter'")
    expect(layout).toContain('<SiteFooter />')
    expect(home).not.toContain('className="site-footer"')
  })

  it('suppresses the signature intro after the first document in a session', () => {
    const shellStyles = readFileSync(resolve(publicSiteRoot, 'site-shell.css'), 'utf8')

    expect(shellStyles).toContain('html.ivmz-signature-seen .signature-intro')
    expect(shellStyles).toContain('animation: none')
  })
})
