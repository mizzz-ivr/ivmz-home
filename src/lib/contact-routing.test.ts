import { describe, expect, it } from 'vitest'
import { recipientFor } from './contact-routing'

describe('recipientFor', () => {
  it('routes general personal work to ivmz', () => {
    expect(recipientFor('personal')).toBe('ivmz@ivrm.jp')
  })

  it('routes developer work to mizzz', () => {
    expect(recipientFor('development')).toBe('mizzz@ivrm.jp')
  })

  it('routes ivRooom contact to the team mailbox', () => {
    expect(recipientFor('community')).toBe('contact@ivrm.jp')
  })

  it('routes security reports separately', () => {
    expect(recipientFor('security')).toBe('security@ivrm.jp')
  })
})
