/**
 * Click-to-load embeds for posts on platforms whose APIs are paid or restricted (X, Instagram,
 * TikTok) plus YouTube. Post URLs come from `SOCIAL_EMBED_URLS`; only these exact URL shapes are
 * turned into an iframe `src` on a fixed host, nothing else is ever embedded.
 */

export type SocialEmbedProvider = 'x' | 'instagram' | 'tiktok' | 'youtube'

export type SocialEmbed = {
  href: string
  provider: SocialEmbedProvider
  src: string
}

export const EMBED_PROVIDER_LABEL: Record<SocialEmbedProvider, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube',
}

const MAX_EMBEDS = 6

export function parseSocialEmbed(value: string): SocialEmbed | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null

  const host = url.hostname.replace(/^www\./, '').replace(/^mobile\./, '')
  const path = url.pathname

  if (host === 'x.com' || host === 'twitter.com') {
    const id = path.match(/^\/[A-Za-z0-9_]{1,15}\/status\/(\d{1,25})\/?$/)?.[1]
    return id
      ? {
          href: `https://x.com${path}`,
          provider: 'x',
          src: `https://platform.twitter.com/embed/Tweet.html?id=${id}`,
        }
      : null
  }

  if (host === 'instagram.com') {
    const match = path.match(/^\/(p|reel)\/([A-Za-z0-9_-]{5,40})\/?$/)
    return match
      ? {
          href: `https://www.instagram.com/${match[1]}/${match[2]}/`,
          provider: 'instagram',
          src: `https://www.instagram.com/${match[1]}/${match[2]}/embed`,
        }
      : null
  }

  if (host === 'tiktok.com') {
    const match = path.match(/^\/@([A-Za-z0-9._]{1,40})\/video\/(\d{1,25})\/?$/)
    return match
      ? {
          href: `https://www.tiktok.com/@${match[1]}/video/${match[2]}`,
          provider: 'tiktok',
          src: `https://www.tiktok.com/embed/v2/${match[2]}`,
        }
      : null
  }

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? path.match(/^\/([A-Za-z0-9_-]{11})$/)?.[1]
        : path === '/watch'
          ? url.searchParams.get('v')?.match(/^[A-Za-z0-9_-]{11}$/)?.[0]
          : undefined
    return id
      ? {
          href: `https://www.youtube.com/watch?v=${id}`,
          provider: 'youtube',
          src: `https://www.youtube-nocookie.com/embed/${id}`,
        }
      : null
  }

  return null
}

/** Parses a comma / whitespace separated list, dropping anything that is not an allowed post URL. */
export function parseSocialEmbeds(raw: string | undefined | null): SocialEmbed[] {
  if (!raw) return []
  const seen = new Set<string>()
  const embeds: SocialEmbed[] = []

  for (const part of raw.split(/[\s,]+/)) {
    const embed = part ? parseSocialEmbed(part) : null
    if (!embed || seen.has(embed.src)) continue
    seen.add(embed.src)
    embeds.push(embed)
    if (embeds.length >= MAX_EMBEDS) break
  }

  return embeds
}
