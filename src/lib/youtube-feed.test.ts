import { describe, expect, it, vi } from 'vitest'

import { getLatestYouTubeVideos, isYouTubeChannelId, parseYouTubeFeed } from './youtube-feed'

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
