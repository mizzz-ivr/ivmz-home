'use client'

import { useState } from 'react'

import { EMBED_PROVIDER_LABEL, type SocialEmbed } from '@/lib/social-embed'

/**
 * Nothing from the third party is requested until the visitor asks for it, so the page stays fast and
 * no tracking happens by default. The iframe is sandboxed and referrer-less.
 */
export function SocialEmbedCard({ embed }: { embed: SocialEmbed }) {
  const [loaded, setLoaded] = useState(false)
  const label = EMBED_PROVIDER_LABEL[embed.provider]

  return (
    <article className={`social-embed social-embed-${embed.provider}`}>
      {loaded ? (
        <iframe
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          src={embed.src}
          title={`${label} post`}
        />
      ) : (
        <div className="social-embed-placeholder">
          <b>{label}</b>
          <p>投稿を表示すると、{label} のサーバーに接続します。</p>
          <div className="social-embed-actions">
            <button type="button" onClick={() => setLoaded(true)}>
              投稿を表示する
            </button>
            <a href={embed.href} target="_blank" rel="noreferrer">
              {label} で開く ↗
            </a>
          </div>
        </div>
      )}
    </article>
  )
}
