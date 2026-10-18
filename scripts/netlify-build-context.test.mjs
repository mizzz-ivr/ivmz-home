import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const config = readFileSync(fileURLToPath(new URL('../netlify.toml', import.meta.url)), 'utf8')

function contextCommand(context) {
  const match = config.match(
    new RegExp(`^\\[context\\.${context}\\]\\s*\\n\\s*command = "([^"]+)"`, 'm'),
  )
  return match?.[1]
}

describe('Netlify build commands must not mutate unverified databases', () => {
  it('requires the Production target guard before building', () => {
    expect(contextCommand('production')).toBe(
      'node scripts/assert-production-database.mjs && pnpm build',
    )
  })

  it.each(['deploy-preview', 'branch-deploy'])(
    'runs the Preview target guard but never auto-migrates in %s',
    (context) => {
      expect(contextCommand(context)).toBe('node scripts/assert-preview-database.mjs && pnpm build')
    },
  )
})
