import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { gotoExpected, reloadExpected } from './navigation'

type PublicDoc = {
  title: string
  slug: string
  canonicalUrl?: string | null
}

type JsonLdDocument = {
  '@type'?: string
  url?: string
}

const detailRoutes = [
  {
    collection: 'works',
    listPath: '/works',
    path: (slug: string) => `/works/${encodeURIComponent(slug)}`,
    primaryLabel: 'View case study',
    emptyHeading: 'No published works yet.',
    schemaType: 'CreativeWork',
  },
  {
    collection: 'posts',
    listPath: '/blog',
    path: (slug: string) => `/blog/${encodeURIComponent(slug)}`,
    primaryLabel: 'Read details',
    emptyHeading: 'No published posts yet.',
    schemaType: 'BlogPosting',
  },
  {
    collection: 'news',
    listPath: '/news',
    path: (slug: string) => `/news/${encodeURIComponent(slug)}`,
    primaryLabel: 'Read update',
    emptyHeading: 'No published news yet.',
    schemaType: 'Article',
  },
] as const

const responsiveWidths = [320, 375, 390, 768, 1024, 1440] as const

async function firstPublishedDoc(request: APIRequestContext, collection: string) {
  const response = await request.get(`/api/${collection}?limit=1&depth=0`)
  expect(response.status(), collection).toBe(200)
  const payload = (await response.json()) as { docs: PublicDoc[] }
  return payload.docs[0] ?? null
}

async function detailStructuredData(page: Page) {
  const values = await page.locator('script[type="application/ld+json"]').allTextContents()
  return values.map((value) => JSON.parse(value) as JsonLdDocument)
}

function normalizedCanonical(value: string) {
  const url = new URL(value)
  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

test('connects published list items to detail routes with h1, reload, metadata and structured data', async ({
  page,
  request,
}) => {
  for (const route of detailRoutes) {
    const doc = await firstPublishedDoc(request, route.collection)
    await gotoExpected(page, route.listPath)

    if (!doc) {
      await expect(page.getByText(route.emptyHeading, { exact: true })).toBeVisible()
      continue
    }

    const row = page.locator('article').filter({ hasText: doc.title })
    await row.getByRole('link', { name: new RegExp(route.primaryLabel, 'i') }).click()

    const detailPath = route.path(doc.slug)
    const internalUrl = new URL(detailPath, 'https://ivmz.ivrm.jp').toString()
    expect(new URL(page.url()).pathname).toBe(detailPath)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.title)

    const expectedCanonical =
      route.collection === 'posts' && doc.canonicalUrl
        ? new URL(doc.canonicalUrl).toString()
        : internalUrl
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expectedCanonical)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      `${doc.title} | mizzz`,
    )

    const schemas = await detailStructuredData(page)
    const detailSchema = schemas.find((schema) => schema['@type'] === route.schemaType)
    const externalCanonicalPost =
      route.collection === 'posts' &&
      doc.canonicalUrl &&
      normalizedCanonical(doc.canonicalUrl) !== normalizedCanonical(internalUrl)

    if (externalCanonicalPost) {
      expect(detailSchema).toBeUndefined()
    } else {
      expect(detailSchema).toMatchObject({ '@type': route.schemaType, url: internalUrl })
    }

    await gotoExpected(page, detailPath)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.title)

    await reloadExpected(page, detailPath)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.title)
  }
})

test('returns the same non-leaking 404 for unknown dynamic slugs', async ({ page }) => {
  for (const route of ['/works', '/blog', '/news']) {
    await gotoExpected(page, `${route}/__ivmz-definitely-not-published__`, 404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Signal not found.')
    await expect(page.getByText(/draftの存在有無も公開routeからは区別しません/)).toBeVisible()
  }
})

test('keeps a representative dynamic route overflow-free at every supported width', async ({
  page,
  request,
}) => {
  const work = await firstPublishedDoc(request, 'works')
  const path = work ? `/works/${encodeURIComponent(work.slug)}` : '/works/__ivmz-responsive-404__'
  const expectedStatus = work ? 200 : 404

  await gotoExpected(page, path, expectedStatus)

  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: 900 })
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth, `${path} overflow at ${width}px`).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    )
  }
})

test('adds published internal detail routes to sitemap without indexing external-canonical posts', async ({
  request,
}) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBe(true)
  const xml = await response.text()

  for (const route of detailRoutes) {
    const doc = await firstPublishedDoc(request, route.collection)
    if (!doc) continue

    const internalUrl = new URL(route.path(doc.slug), 'https://ivmz.ivrm.jp').toString()
    if (
      route.collection === 'posts' &&
      doc.canonicalUrl &&
      normalizedCanonical(doc.canonicalUrl) !== normalizedCanonical(internalUrl)
    ) {
      expect(xml).not.toContain(`<loc>${internalUrl}</loc>`)
    } else {
      expect(xml).toContain(`<loc>${internalUrl}</loc>`)
    }
  }
})
