const OWNER = 'mizzz-ivr'
const REPO = 'mizzz-ivr'
const EVENT_TYPE = 'profile-signal-full'
const API_VERSION = '2026-03-10'

const handler = async () => {
  const token = process.env.PROFILE_SIGNAL_GITHUB_TOKEN
  if (!token) {
    throw new Error('PROFILE_SIGNAL_GITHUB_TOKEN is not configured')
  }

  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ivmz-home-profile-signal-dispatcher',
      'X-GitHub-Api-Version': API_VERSION,
    },
    body: JSON.stringify({
      event_type: EVENT_TYPE,
      client_payload: {
        source: 'netlify',
        requested_at: new Date().toISOString(),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Profile Signal full dispatch failed: HTTP ${response.status}`)
  }

  console.log('Profile Signal full dispatch accepted by GitHub')
}

export default handler
