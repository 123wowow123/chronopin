import { plainText } from './format';
import { pinPath, absoluteUrl } from './seo';
import type { PinJson } from './types';

// Public calendar feeds (.ics, RFC 5545): a tag, company, person or thread as
// a calendar anyone can subscribe to (webcal:// or "From URL" in Google
// Calendar). The subscriber's calendar re-polls the URL, so a moved date
// updates in place: each pin keeps one UID for good.

const DAY_MS = 86_400_000;

// Text values: backslash, semicolon, comma and newline are escaped.
export function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Content lines are folded at 75 octets, continuation lines starting with a
// space; never inside a multi-byte character.
export function foldLine(line: string): string {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let limit = 75;
  for (const ch of line) {
    if (Buffer.byteLength(current + ch) > limit) {
      parts.push(current);
      current = '';
      limit = 74;
    }
    current += ch;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function dateValue(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// The confidence word travels with the event: a date that is only estimated
// shows tentative in the subscriber's calendar.
const FIRM = new Set(['confirmed', 'scheduled']);

export function pinEvent(pin: PinJson, now: Date): string[] {
  const start = new Date(pin.utcStartDateTime);
  const url = absoluteUrl(pinPath(pin));
  const confidence = pin.dateConfidence ? `Date: ${pin.dateConfidence}.` : '';
  const body = [plainText(pin.description, 500), confidence, url].filter(Boolean).join('\n\n');
  const lines = ['BEGIN:VEVENT', `UID:pin-${pin.id}@chronopin.com`, `DTSTAMP:${stamp(pin.utcUpdatedDateTime ? new Date(pin.utcUpdatedDateTime) : now)}`];
  if (pin.allDay) {
    // The stored end is the day after the last day, which is what DTEND means for a date.
    const end = pin.utcEndDateTime ? new Date(pin.utcEndDateTime) : new Date(start.getTime() + DAY_MS);
    lines.push(`DTSTART;VALUE=DATE:${dateValue(start)}`, `DTEND;VALUE=DATE:${dateValue(end > start ? end : new Date(start.getTime() + DAY_MS))}`);
  } else {
    lines.push(`DTSTART:${stamp(start)}`);
    if (pin.utcEndDateTime && new Date(pin.utcEndDateTime) > start) lines.push(`DTEND:${stamp(new Date(pin.utcEndDateTime))}`);
  }
  lines.push(`SUMMARY:${icsText(pin.title)}`, `DESCRIPTION:${icsText(body)}`, `URL:${url}`, `STATUS:${FIRM.has(pin.dateConfidence ?? '') ? 'CONFIRMED' : 'TENTATIVE'}`);
  if (pin.address) lines.push(`LOCATION:${icsText(pin.address)}`);
  if (pin.latitude != null && pin.longitude != null) lines.push(`GEO:${pin.latitude};${pin.longitude}`);
  lines.push('END:VEVENT');
  return lines;
}

export function icsCalendar(name: string, description: string, pins: PinJson[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chronopin//Calendar feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(name)}`,
    `X-WR-CALDESC:${icsText(description)}`,
    // Clients that honor these re-poll twice a day; Google decides for itself.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...pins.flatMap((pin) => pinEvent(pin, now)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
