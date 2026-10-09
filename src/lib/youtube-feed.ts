/**
 * Latest uploads of a public YouTube channel from its public Atom feed (no API key, no quota).
 * Enabled by `YOUTUBE_CHANNEL_ID`; every failure degrades to an empty list.
 */

export type YouTubeVideo = {
  id: string
  publishedAt: string | null
  thumbnail: string
  title: string
  url: string
}

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const TIMEOUT_MS = 2_500
const REVALIDATE_SECONDS = 1_800
const MAX_BYTES = 512 * 1024

export function isYouTubeChannelId(value: string | undefined | null): value is string {
  return Boolean(value && CHANNEL_ID.test(value))
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function tag(entry: string, name: string) {
  const match = entry.match(new RegExp(`<${name}>([^<]*)</${name}>`))
  return match ? decodeXml(match[1]).trim() : null
}

export function parseYouTubeFeed(xml: string, limit = 6): YouTubeVideo[] {
  const videos: YouTubeVideo[] = []

  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1]
    const id = tag(entry, 'yt:videoId')
    const title = tag(entry, 'title')
    if (!id || !VIDEO_ID.test(id) || !title) continue

    const published = tag(entry, 'published')
    videos.push({
      id,
      publishedAt: published && !Number.isNaN(Date.parse(published)) ? published : null,
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      title: title.slice(0, 200),
      url: `https://www.youtube.com/watch?v=${id}`,
    })
    if (videos.length >= limit) break
  }

  return videos
}

export async function getLatestYouTubeVideos(
  channelId: string | undefined = process.env.YOUTUBE_CHANNEL_ID,
  fetcher: typeof fetch = fetch,
  limit = 6,
): Promise<YouTubeVideo[]> {
  if (!isYouTubeChannelId(channelId)) return []

  try {
    const response = await fetcher(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      {
        headers: { 'User-Agent': 'ivmz-home' },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      } as RequestInit,
    )
    if (!response.ok) return []
    const text = await response.text()
    return text.length > MAX_BYTES ? [] : parseYouTubeFeed(text, limit)
  } catch {
    return []
  }
}
