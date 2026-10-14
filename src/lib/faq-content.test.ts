import { describe, expect, it } from 'vitest'

import {
  faqEntries,
  findEntry,
  matchQuestion,
  normalizeQuery,
  topLevelQuestionIds,
} from './faq-content'

describe('faq content', () => {
  it('has unique ids and only references entries that exist', () => {
    const ids = faqEntries.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of faqEntries) {
      for (const related of entry.related) expect(findEntry(related), related).toBeDefined()
      expect(entry.related).not.toContain(entry.id)
      expect(entry.answer.length).toBeGreaterThan(0)
    }
    for (const id of topLevelQuestionIds) expect(findEntry(id), id).toBeDefined()
  })

  it('only links to the site or to https pages', () => {
    for (const entry of faqEntries) {
      if (!entry.link) continue
      expect(entry.link.href.startsWith('/') || entry.link.href.startsWith('https://')).toBe(true)
    }
  })

  it('normalizes width, case, spaces and punctuation', () => {
    expect(normalizeQuery(' ＰＤＦ を、送れますか？ ')).toBe('pdfを送れますか')
  })

  it.each([
    ['仕事を依頼したいです', 'consult'],
    ['PDFを添付できますか？', 'attachments'],
    ['返信はいつ頃になりますか', 'reply'],
    ['個人情報はどう保管されますか', 'privacy'],
    ['得意な言語は？', 'skills'],
    ['脆弱性を見つけました', 'security'],
    ['YouTubeはありますか', 'schedule'],
    ['x', 'schedule'],
  ])('routes "%s" to %s', (question, id) => {
    expect(matchQuestion(question)?.id).toBe(id)
  })

  it('returns null for empty or unrelated input', () => {
    expect(matchQuestion('')).toBeNull()
    expect(matchQuestion('   ')).toBeNull()
    expect(matchQuestion('今日の天気は？')).toBeNull()
    expect(matchQuestion('xylophone')).toBeNull()
  })

  it('ignores anything beyond the input limit', () => {
    expect(matchQuestion('あ'.repeat(500) + '添付')).toBeNull()
  })
})
