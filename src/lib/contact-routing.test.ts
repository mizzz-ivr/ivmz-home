import { describe, expect, it } from 'vitest'
import { recipientFor } from './contact-routing'

describe('recipientFor', () => {
  it.each(['personal', 'job', 'collaboration', 'media'] as const)(
    'routes %s contact to ivmz',
    (category) => {
      expect(recipientFor(category)).toBe('ivmz@ivrm.jp')
    },
  )

  it('routes developer work to mizzz', () => {
    expect(recipientFor('development')).toBe('mizzz@ivrm.jp')
  })

  it.each(['community', 'team'] as const)(
    'routes %s contact to the ivRooom mailbox',
    (category) => {
      expect(recipientFor(category)).toBe('contact@ivrm.jp')
    },
  )

  it('routes security reports separately', () => {
    expect(recipientFor('security')).toBe('security@ivrm.jp')
  })
})
