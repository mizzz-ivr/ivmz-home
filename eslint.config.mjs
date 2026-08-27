import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/app/(site)/**/*.tsx', 'src/components/site/**/*.tsx'],
    rules: {
      // Public site navigation intentionally performs full document requests to preserve MPA semantics.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'src/migrations/**',
  ]),
])
