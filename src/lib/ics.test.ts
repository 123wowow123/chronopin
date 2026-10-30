import { describe, expect, it } from 'vitest';
import { foldLine, icsCalendar, icsText } from './ics';
import type { PinJson } from './types';

const now = new Date('2027-01-01T00:00:00Z');
const pin = (over: Partial<PinJson>) => ({ id: 7, title: 'Big Launch; part 1, live', utcStartDateTime: '2027-03-04T18:30:00.000Z', dateConfidence: 'confirmed', ...over }) as PinJson;

describe('ics', () => {
  it('escapes text and folds long lines on character boundaries', () => {
    expect(icsText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
    const folded = foldLine('X:' + '長'.repeat(60));
    for (const part of folded.split('\r\n')) expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe('X:' + '長'.repeat(60));
  });

  it('writes a timed pin as UTC instants with a stable UID', () => {
    const text = icsCalendar('Tag: anime', 'desc', [pin({ utcEndDateTime: '2027-03-04T20:00:00.000Z' })], now);
    expect(text).toContain('UID:pin-7@chronopin.com');
    expect(text).toContain('DTSTART:20270304T183000Z');
    expect(text).toContain('DTEND:20270304T200000Z');
    expect(text).toContain('SUMMARY:Big Launch\; part 1\\, live');
    expect(text).toContain('STATUS:CONFIRMED');
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('writes an all-day pin as dates with an exclusive end, tentative when estimated', () => {
    const one = icsCalendar('x', 'y', [pin({ allDay: true, utcStartDateTime: '2027-03-04T00:00:00.000Z', dateConfidence: 'estimated' })], now);
    expect(one).toContain('DTSTART;VALUE=DATE:20270304');
    expect(one).toContain('DTEND;VALUE=DATE:20270305');
    expect(one).toContain('STATUS:TENTATIVE');
    const run = icsCalendar('x', 'y', [pin({ allDay: true, utcStartDateTime: '2027-03-04T00:00:00.000Z', utcEndDateTime: '2027-03-07T00:00:00.000Z' })], now);
    expect(run).toContain('DTEND;VALUE=DATE:20270307');
  });
});
