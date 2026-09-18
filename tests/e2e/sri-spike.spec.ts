import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'

type ScriptAsset = {
  src: string
  integrity: string | null
}

function extractScriptAssets(html: string) {
  const assets: ScriptAsset[] = []
  const scriptTagPattern = /<script\b[^>]*>/gi

  for (const match of html.matchAll(scriptTagPattern)) {
    const tag = match[0]
    const src = tag.match(/\bsrc=(?:"([^"]+)"|'([^']+)')/i)
    const integrity = tag.match(/\bintegrity=(?:"([^"]+)"|'([^']+)')/i)
    const srcValue = src?.[1] ?? src?.[2]

    if (!srcValue || !srcValue.includes('/_next/static/')) continue

    assets.push({
      src: srcValue,
      integrity: integrity?.[1] ?? integrity?.[2] ?? null,
    })
  }

  return assets
}

test.describe('Next.js SRI spike', () => {
  test('Netlify-served Next.js scripts expose matching SHA-256 integrity metadata', async ({
    request,
  }, testInfo) => {
    test.skip(!process.env.E2E_BASE_URL, 'SRI spike validates a real remote Deploy Preview.')

    // The byte-level validation is browser-independent. Run it once while the normal
    // E2E suite continues exercising both Chromium and mobile WebKit.
    test.skip(testInfo.project.name !== 'chromium', 'Run byte-level SRI validation once.')

    const documentResponse = await request.get('/')
    expect(documentResponse.status()).toBe(200)

    const assets = extractScriptAssets(await documentResponse.text())
    expect(assets.length, 'Next.js external script assets').toBeGreaterThan(0)

    const missingIntegrity = assets.filter((asset) => !asset.integrity)
    expect(
      missingIntegrity.map((asset) => new URL(asset.src, documentResponse.url()).pathname),
      'every emitted Next.js script must carry integrity metadata',
    ).toEqual([])

    let verified = 0

    for (const asset of assets) {
      const integrity = asset.integrity ?? ''
      const expected = integrity
        .split(/\s+/)
        .find((token) => token.startsWith('sha256-'))

      expect(expected, 'SHA-256 integrity token').toBeTruthy()
      if (!expected) continue

      const assetUrl = new URL(asset.src, documentResponse.url())
      const assetResponse = await request.get(assetUrl.toString())
      expect(assetResponse.status(), assetUrl.pathname).toBe(200)

      const digest = createHash('sha256')
        .update(await assetResponse.body())
        .digest('base64')

      expect(`sha256-${digest}`, assetUrl.pathname).toBe(expected)
      verified += 1
    }

    console.info(
      `SRI_SPIKE ${JSON.stringify({
        algorithm: 'sha256',
        emittedScripts: assets.length,
        verifiedScripts: verified,
      })}`,
    )
  })
})
