// Netlify production-context ignore script (#182).
//
// Exit 0 skips the build (no production deploy, saving the 15-credit
// production deploy cost). Exit 1 lets the build continue.
// The build is skipped only when every changed file belongs to a category
// that cannot change the deployed site: documentation, CI configuration,
// tests and other tooling-only files. Any doubt (missing refs, git errors,
// unrecognized paths) falls back to building.
//
// This is wired only into [context.production] in netlify.toml. Deploy
// Previews intentionally have no ignore rule: previews are free and the
// visual check workflow depends on them always being built.

import { execFileSync } from 'node:child_process'

const from = process.env.CACHED_COMMIT_REF
const to = process.env.COMMIT_REF

if (!from || !to) {
  process.exit(1)
}

let files
try {
  const out = execFileSync('git', ['diff', '--name-only', `${from}...${to}`], {
    encoding: 'utf8',
  })
  files = out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
} catch {
  process.exit(1)
}

if (files.length === 0) {
  process.exit(1)
}

const skippablePatterns = [
  /^docs\//,
  /^\.github\//,
  /^tests\//,
  /(^|\/)__tests__\//,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /\.md$/,
  /^\.prettierrc\.json$/,
  /^\.prettierignore$/,
  /^\.gitignore$/,
  /^eslint\.config\./,
  /^vitest\.config\./,
  /^playwright\.config\./,
  /^tsconfig(\..+)?\.json$/,
]

const isSkippable = (path) => skippablePatterns.some((pattern) => pattern.test(path))

process.exit(files.every(isSkippable) ? 0 : 1)
