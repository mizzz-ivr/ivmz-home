import { describe, expect, it, vi } from 'vitest'

import {
  getLatestYouTubeVideos,
  isYouTubeChannelId,
  parseYouTubeChannelRef,
  parseYouTubeFeed,
  resolveYouTubeChannelId,
} from './youtube-feed'

const feed = `<?xml version="1.0"?><feed>
<entry><yt:videoId>abcdefghijk</yt:videoId><title>Hello &amp; &lt;world&gt;</title><published>2026-10-01T00:00:00+00:00</published></entry>
<entry><yt:videoId>bad id!</yt:videoId><title>Broken</title></entry>
<entry><yt:videoId>lmnopqrstuv</yt:videoId><title>Second</title><published>nope</published></entry>
</feed>`

describe('youtube feed', () => {
  it('validates channel ids', () => {
    expect(isYouTubeChannelId('UC' + 'a'.repeat(22))).toBe(true)
    for (const value of [
      '',
      undefined,
      'UCshort',
      'AB' + 'a'.repeat(22),
      'UC' + 'a'.repeat(22) + '&x=1',
    ]) {
      expect(isYouTubeChannelId(value)).toBe(false)
    }
  })

  it('parses entries, decodes text and skips malformed ids', () => {
    const videos = parseYouTubeFeed(feed)
    expect(videos.map((video) => video.id)).toEqual(['abcdefghijk', 'lmnopqrstuv'])
    expect(videos[0].title).toBe('Hello & <world>')
    expect(videos[0].url).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    expect(videos[0].thumbnail).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
    expect(videos[1].publishedAt).toBeNull()
  })

  it('respects the limit', () => {
    expect(parseYouTubeFeed(feed, 1)).toHaveLength(1)
  })

  it('does not call the network without a valid channel id', async () => {
    const fetcher = vi.fn()
    expect(await getLatestYouTubeVideos(undefined, fetcher)).toEqual([])
    expect(await getLatestYouTubeVideos('nope', fetcher)).toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns [] on HTTP or network failure', async () => {
    const id = 'UC' + 'a'.repeat(22)
    expect(
      await getLatestYouTubeVideos(
        id,
        vi.fn().mockResolvedValue(new Response('', { status: 500 })),
      ),
    ).toEqual([])
    expect(await getLatestYouTubeVideos(id, vi.fn().mockRejectedValue(new Error('x')))).toEqual([])
  })

  it('fetches only the fixed feed host', async () => {
    const id = 'UC' + 'a'.repeat(22)
    const fetcher = vi.fn().mockResolvedValue(new Response(feed, { status: 200 }))
    const videos = await getLatestYouTubeVideos(id, fetcher)
    expect(videos).toHaveLength(2)
    expect(fetcher.mock.calls[0][0]).toBe(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`,
    )
  })
})

describe('youtube channel refs', () => {
  const id = 'UC' + 'a'.repeat(22)

  it('parses ids, channel urls, handle urls and bare handles', () => {
    expect(parseYouTubeChannelRef(id)).toEqual({ channelId: id })
    expect(parseYouTubeChannelRef(`https://www.youtube.com/channel/${id}`)).toEqual({
      channelId: id,
    })
    expect(parseYouTubeChannelRef('https://www.youtube.com/@ivuru-mz')).toEqual({
      handle: 'ivuru-mz',
    })
    expect(parseYouTubeChannelRef('@ivuru-mz')).toEqual({ handle: 'ivuru-mz' })
  })

  it('rejects other hosts, schemes and paths', () => {
    expect(parseYouTubeChannelRef('https://evil.example/@ivuru-mz')).toBeNull()
    expect(parseYouTubeChannelRef('http://www.youtube.com/@ivuru-mz')).toBeNull()
    expect(parseYouTubeChannelRef('https://www.youtube.com/watch?v=abcdefghijk')).toBeNull()
    expect(parseYouTubeChannelRef('')).toBeNull()
  })

  it('resolves a handle through the channel page', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          `<html><link rel="canonical" href="https://www.youtube.com/channel/${id}"></html>`,
        ),
    ) as unknown as typeof fetch
    await expect(resolveYouTubeChannelId({ handle: 'ivuru-mz' }, fetcher)).resolves.toBe(id)
  })

  it('returns nothing when the handle page has no id', async () => {
    const fetcher = vi.fn(async () => new Response('<html></html>')) as unknown as typeof fetch
    await expect(resolveYouTubeChannelId({ handle: 'nobody' }, fetcher)).resolves.toBeNull()
  })

  it('loads videos for a handle', async () => {
    const calls: string[] = []
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url)
      return new Response(url.includes('/feeds/') ? feed : `<html>"externalId":"${id}"</html>`)
    }) as unknown as typeof fetch
    const videos = await getLatestYouTubeVideos('https://www.youtube.com/@ivuru-mz', fetcher)
    expect(videos.length).toBeGreaterThan(0)
    expect(calls[1]).toContain(`channel_id=${id}`)
  })
})
