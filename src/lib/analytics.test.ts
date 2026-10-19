import { describe, expect, it } from 'vitest'
import { isTrackablePath, parseMeasurementId } from './analytics'

describe('Google Analytics privacy boundaries', () => {
  it('rejects invalid measurement identifiers', () => {
    expect(parseMeasurementId(undefined)).toBeNull()
    expect(parseMeasurementId('UA-12345-1')).toBeNull()
    expect(parseMeasurementId('G-;alert(1)')).toBeNull()
    expect(parseMeasurementId(' G-ABCDEF123 ')).toBe('G-ABCDEF123')
  })

  it('tracks only public non-sensitive routes', () => {
    expect(isTrackablePath('/')).toBe(true)
    expect(isTrackablePath('/works/sample')).toBe(true)
    for (const path of [
      '/admin',
      '/admin/collections/users',
      '/api/chat',
      '/contact',
      '/message/secret',
      '/legal/privacy',
      '/legal/terms',
    ]) {
      expect(isTrackablePath(path), path).toBe(false)
    }
    expect(isTrackablePath('https://example.test/')).toBe(false)
  })
})
