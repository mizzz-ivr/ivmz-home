import { describe, expect, it, vi } from 'vitest'

import {
  getUpcomingGoogleCalendarEvents,
  isGoogleCalendarId,
  parseIcalEvents,
} from './google-calendar'

const NOW = Date.UTC(2026, 9, 9, 0, 0, 0)

const ics = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART:20261020T100000Z',
  'DTEND:20261020T110000Z',
  'SUMMARY:Live\\, stream\; test',
  'LOCATION:Online',
  'URL:https://example.com/live',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tokyo:20261012T190000',
  'DTEND;TZID=Asia/Tokyo:20261012T200000',
  'SUMMARY:Tokyo local',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261015',
  'DTEND;VALUE=DATE:20261016',
  'SUMMARY:All day',
  'URL:javascript:alert(1)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20200101T000000Z',
  'SUMMARY:Past',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261030T000000Z',
  'SUMMARY:Cancelled',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261025T000000Z',
  'SUMMARY:Folded',
  ' title',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('google calendar', () => {
  it('validates calendar ids', () => {
    expect(isGoogleCalendarId('me@gmail.com')).toBe(true)
    expect(isGoogleCalendarId('abc123@group.calendar.google.com')).toBe(true)
    expect(isGoogleCalendarId('ja.japanese#holiday@group.v.calendar.google.com')).toBe(true)
    for (const value of ['', undefined, 'a/b', 'a b', '../x', 'x'.repeat(300)]) {
      expect(isGoogleCalendarId(value)).toBe(false)
    }
  })

  it('returns upcoming events in order and unescapes text', () => {
    const events = parseIcalEvents(ics, NOW)
    expect(events.map((event) => event.title)).toEqual([
      'Tokyo local',
      'All day',
      'Live, stream; test',
      'Foldedtitle',
    ])
  })

  it('converts TZID times to UTC (JST = UTC+9)', () => {
    const tokyo = parseIcalEvents(ics, NOW).find((event) => event.title === 'Tokyo local')
    expect(tokyo?.start).toBe('2026-10-12T10:00:00.000Z')
  })

  it('marks all-day events, drops cancelled and past ones, and only keeps http(s) urls', () => {
    const events = parseIcalEvents(ics, NOW)
    expect(events.find((event) => event.title === 'All day')).toMatchObject({
      allDay: true,
      url: null,
    })
    expect(events.some((event) => event.title === 'Past' || event.title === 'Cancelled')).toBe(
      false,
    )
    expect(events.find((event) => event.title.startsWith('Live'))?.url).toBe(
      'https://example.com/live',
    )
  })

  it('respects the limit', () => {
    expect(parseIcalEvents(ics, NOW, 2)).toHaveLength(2)
  })

  it('does not fetch without a valid id and survives failures', async () => {
    const fetcher = vi.fn()
    expect(await getUpcomingGoogleCalendarEvents(undefined, fetcher)).toEqual([])
    expect(await getUpcomingGoogleCalendarEvents('a/b', fetcher)).toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
    expect(
      await getUpcomingGoogleCalendarEvents(
        'me@gmail.com',
        vi.fn().mockRejectedValue(new Error('x')),
      ),
    ).toEqual([])
    expect(
      await getUpcomingGoogleCalendarEvents(
        'me@gmail.com',
        vi.fn().mockResolvedValue(new Response('', { status: 404 })),
      ),
    ).toEqual([])
  })

  it('encodes # in public holiday calendar ids', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(ics, { status: 200 }))
    await getUpcomingGoogleCalendarEvents(
      'ja.japanese#holiday@group.v.calendar.google.com',
      fetcher,
    )
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://calendar.google.com/calendar/ical/ja.japanese%23holiday%40group.v.calendar.google.com/public/basic.ics',
    )
  })

  it('fetches only the fixed calendar host with an encoded id', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(ics, { status: 200 }))
    await getUpcomingGoogleCalendarEvents('me@gmail.com', fetcher)
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://calendar.google.com/calendar/ical/me%40gmail.com/public/basic.ics',
    )
  })
})
