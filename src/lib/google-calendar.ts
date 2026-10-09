/**
 * Upcoming events of a PUBLIC Google Calendar from its public iCal feed (no API key).
 * Enabled by `GOOGLE_CALENDAR_ID`. Only calendars whose sharing is "Make available to public" work.
 * Limits: recurring events (RRULE) are shown only for their first occurrence; every failure degrades
 * to an empty list.
 */

export type CalendarEvent = {
  allDay: boolean
  end: string | null
  location: string | null
  start: string
  title: string
  url: string | null
}

const CALENDAR_ID = /^[A-Za-z0-9._%+#-]+(?:@[A-Za-z0-9.-]+)?$/
const TIMEOUT_MS = 3_000
const REVALIDATE_SECONDS = 900
const MAX_BYTES = 2 * 1024 * 1024

export function isGoogleCalendarId(value: string | undefined | null): value is string {
  return Boolean(value && value.length <= 200 && CALENDAR_ID.test(value))
}

function unfold(text: string) {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
}

function unescapeText(value: string) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\([,;\\])/g, '$1')
    .trim()
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return (
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) -
    utcMs
  )
}

function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string,
) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  try {
    return guess - zoneOffset(guess - zoneOffset(guess, timeZone), timeZone)
  } catch {
    return guess
  }
}

type ParsedDate = { allDay: boolean; ms: number }

function parseIcalDate(value: string, params: string): ParsedDate | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!match) return null
  const [, y, mo, d, h, mi, s, z] = match

  if (h === undefined) {
    return { allDay: true, ms: Date.UTC(Number(y), Number(mo) - 1, Number(d)) }
  }
  if (z) {
    return {
      allDay: false,
      ms: Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)),
    }
  }

  const tz = params.match(/TZID=([^;:]+)/)?.[1] ?? 'Asia/Tokyo'
  return {
    allDay: false,
    ms: zonedToUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s), tz),
  }
}

function safeHttpUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function parseIcalEvents(ics: string, now = Date.now(), limit = 10): CalendarEvent[] {
  const events: Array<CalendarEvent & { startMs: number; endMs: number }> = []
  let current: Record<string, { params: string; value: string }> | null = null

  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      const item = current
      current = null
      if (!item?.DTSTART || !item.SUMMARY) continue
      if (item.STATUS?.value.toUpperCase() === 'CANCELLED') continue

      const start = parseIcalDate(item.DTSTART.value, item.DTSTART.params)
      if (!start) continue
      const end = item.DTEND ? parseIcalDate(item.DTEND.value, item.DTEND.params) : null
      const endMs = end?.ms ?? start.ms + (start.allDay ? 86_400_000 : 0)
      if (endMs < now) continue

      events.push({
        allDay: start.allDay,
        end: end ? new Date(end.ms).toISOString() : null,
        endMs,
        location: item.LOCATION ? unescapeText(item.LOCATION.value).slice(0, 200) || null : null,
        start: new Date(start.ms).toISOString(),
        startMs: start.ms,
        title: unescapeText(item.SUMMARY.value).slice(0, 200),
        url: safeHttpUrl(item.URL ? unescapeText(item.URL.value) : null),
      })
      continue
    }
    if (!current) continue

    const colon = line.indexOf(':')
    if (colon < 1) continue
    const head = line.slice(0, colon)
    const [name, ...rest] = head.split(';')
    // First occurrence wins (nested VALARM etc. use other names).
    if (!(name in current)) current[name] = { params: rest.join(';'), value: line.slice(colon + 1) }
  }

  return events
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, limit)
    .map(({ allDay, end, location, start, title, url }) => ({
      allDay,
      end,
      location,
      start,
      title,
      url,
    }))
}

export async function getUpcomingGoogleCalendarEvents(
  calendarId: string | undefined = process.env.GOOGLE_CALENDAR_ID,
  fetcher: typeof fetch = fetch,
  limit = 10,
): Promise<CalendarEvent[]> {
  if (!isGoogleCalendarId(calendarId)) return []

  try {
    const response = await fetcher(
      `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`,
      {
        headers: { 'User-Agent': 'ivmz-home' },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      } as RequestInit,
    )
    if (!response.ok) return []
    const text = await response.text()
    return text.length > MAX_BYTES ? [] : parseIcalEvents(text, Date.now(), limit)
  } catch {
    return []
  }
}
