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

// Handles may use letters/digits from any script (1-30 chars); the host and path stay strictly validated.
const HANDLE = /^[\p{L}\p{N}._\-\u00B7]{1,30}$/u
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const TIMEOUT_MS = 2_500
const REVALIDATE_SECONDS = 1_800
const MAX_BYTES = 512 * 1024

export type YouTubeChannelRef = { channelId: string } | { handle: string }

/** Accepts a channel ID, a /channel/UC… URL, a /@handle URL or a bare @handle. */
export function parseYouTubeChannelRef(input: string | undefined | null): YouTubeChannelRef | null {
  const value = input?.trim()
  if (!value) return null
  if (CHANNEL_ID.test(value)) return { channelId: value }

  if (value.startsWith('@') && HANDLE.test(value.slice(1))) return { handle: value.slice(1) }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) return null

  const channel = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/)?.[1]
  if (channel) return { channelId: channel }
  let path: string
  try {
    path = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  const handle = path.match(/^\/@([^/]+)\/?$/)?.[1]
  return handle && HANDLE.test(handle) ? { handle } : null
}

/** Reads the channel ID from the public channel page of a handle (cached for a day). */
export async function resolveYouTubeChannelId(
  ref: YouTubeChannelRef,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if ('channelId' in ref) return ref.channelId

  try {
    const response = await fetcher(`https://www.youtube.com/@${encodeURIComponent(ref.handle)}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Mozilla/5.0 (compatible; ivmz-home)' },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    } as RequestInit)
    if (!response.ok) return null
    const html = (await response.text()).slice(0, 2 * MAX_BYTES)
    const id =
      html.match(
        /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/,
      )?.[1] ??
      html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/)?.[1] ??
      html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/)?.[1]
    return id ?? null
  } catch {
    return null
  }
}

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
  channel: string | undefined = process.env.YOUTUBE_CHANNEL_ID,
  fetcher: typeof fetch = fetch,
  limit = 6,
): Promise<YouTubeVideo[]> {
  const ref = parseYouTubeChannelRef(channel)
  if (!ref) return []

  try {
    const channelId = await resolveYouTubeChannelId(ref, fetcher)
    if (!isYouTubeChannelId(channelId)) return []

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
