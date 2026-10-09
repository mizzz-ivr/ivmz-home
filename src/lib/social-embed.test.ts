import { describe, expect, it } from 'vitest'

import { parseSocialEmbed, parseSocialEmbeds } from './social-embed'

describe('parseSocialEmbed', () => {
  it('maps supported post URLs to fixed-host embed sources', () => {
    expect(parseSocialEmbed('https://x.com/mizzz/status/1234567890')?.src).toBe(
      'https://platform.twitter.com/embed/Tweet.html?id=1234567890',
    )
    expect(parseSocialEmbed('https://twitter.com/mizzz/status/1')?.provider).toBe('x')
    expect(parseSocialEmbed('https://www.instagram.com/p/Abc123_-x/')?.src).toBe(
      'https://www.instagram.com/p/Abc123_-x/embed',
    )
    expect(parseSocialEmbed('https://www.instagram.com/reel/Abc123xyz/')?.provider).toBe(
      'instagram',
    )
    expect(parseSocialEmbed('https://www.tiktok.com/@ivmz/video/7000000000000')?.src).toBe(
      'https://www.tiktok.com/embed/v2/7000000000000',
    )
    expect(parseSocialEmbed('https://www.tiktok.com/@my_name.v2/video/7000000000001')?.src).toBe(
      'https://www.tiktok.com/embed/v2/7000000000001',
    )
    expect(parseSocialEmbed('https://youtu.be/abcdefghijk')?.src).toBe(
      'https://www.youtube-nocookie.com/embed/abcdefghijk',
    )
    expect(parseSocialEmbed('https://www.youtube.com/watch?v=abcdefghijk&t=3')?.provider).toBe(
      'youtube',
    )
  })

  it('rejects look-alike hosts, profiles, bad ids and unsafe URLs', () => {
    for (const value of [
      'https://x.com.evil.example/a/status/1',
      'https://evil.example/x.com/a/status/1',
      'https://x.com/mizzz',
      'https://x.com/mizzz/status/abc',
      'http://x.com/mizzz/status/1',
      'https://user:pw@x.com/mizzz/status/1',
      'https://www.instagram.com/mizzz/',
      'https://www.tiktok.com/@ivmz',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/embed/abcdefghijk',
      'javascript:alert(1)',
      'nope',
    ]) {
      expect(parseSocialEmbed(value)).toBeNull()
    }
  })
})

describe('parseSocialEmbeds', () => {
  it('splits a list, drops invalid and duplicate entries and caps the count', () => {
    const list = [
      'https://x.com/a/status/1',
      'https://x.com/a/status/1',
      'https://evil.example/',
      ...Array.from({ length: 10 }, (_, index) => `https://x.com/a/status/${index + 2}`),
    ].join(',\n ')

    const embeds = parseSocialEmbeds(list)
    expect(embeds).toHaveLength(6)
    expect(embeds[0].src).toContain('id=1')
    expect(parseSocialEmbeds(undefined)).toEqual([])
  })
})
