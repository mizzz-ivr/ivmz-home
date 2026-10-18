import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'

import { readApprovedAnonymousMessage } from '@/messages/public-reader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const alt = '承認された匿名メッセージと返信'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const compact = (value: string, max: number) => {
  const chars = Array.from(value.replace(/\s+/g, ' ').trim())
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : chars.join('')
}

export default async function Image({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const approved = await readApprovedAnonymousMessage(publicId)
  if (!approved || approved.publicId !== publicId) notFound()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 64,
          color: '#f8f5ff',
          background: '#101225',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 27, letterSpacing: 2, color: '#bcb8ff' }}>
          <span>ivmz / MESSAGE</span>
          <span>ANONYMOUS / APPROVED</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34, width: '100%' }}>
          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
            {compact(approved.message, 90)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '2px solid #6d67a3', paddingTop: 22 }}>
            <span style={{ fontSize: 22, color: '#bcb8ff' }}>REPLY / IVMZ</span>
            <span style={{ fontSize: 30, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
              {compact(approved.reply, 100)}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 24, color: '#bcb8ff' }}>ivmz.ivrm.jp</div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Netlify-CDN-Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  )
}
