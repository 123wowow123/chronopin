import type { FoundReference } from '../extract/references';

// A source that states no date leaves the pin undated, but its references
// often do date the event (each carries its own startDate and endDate, only
// where its page gives a specific day). Owner, 2026-09-30: "estimated dates
// are fine and scraper should have ability to estimate dates based on all the
// sources". So an undated pin takes the best-supported reference's day,
// `estimated`, with the reasoning naming the sources it rests on.

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// The fields it reads and writes; the index signature is for Pin, which declares none.
type Dated = { [key: string]: unknown; utcStartDateTime?: Date; utcEndDateTime?: Date; allDay?: boolean; allDayStated?: boolean; dateConfidence?: string; dateConfidenceReasoning?: string };

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const dayMs = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);

// Whether the pin still needs a date: none read from the source, or the source
// itself said it could not tell.
export function isUndated(pin: Dated): boolean {
  return !pin.utcStartDateTime || pin.dateConfidence === 'unknown';
}

// Dates an undated pin from its references, in place. The most confident
// reference with a start date leads (a tie goes to the newer publication); the
// others that name a day are listed, agreeing or not, so a reader sees how
// firm the estimate is. Never dates from a publication date: an article's own
// day is not the event's. Returns whether the pin was dated.
export function estimateFromReferences(pin: Dated, references: FoundReference[]): boolean {
  if (!isUndated(pin)) return false;
  const dated = references
    .filter((r) => YMD.test(r.startDate || '') && Number.isFinite(dayMs(r.startDate as string)))
    .sort((a, b) => b.confidence - a.confidence || (b.publishedDate || '').localeCompare(a.publishedDate || ''));
  const lead = dated[0];
  if (!lead) return false;

  const start = dayMs(lead.startDate as string);
  const lastDay = YMD.test(lead.endDate || '') && (lead.endDate as string) >= (lead.startDate as string) ? dayMs(lead.endDate as string) : start;
  pin.utcStartDateTime = new Date(start);
  pin.utcEndDateTime = new Date(lastDay + DAY_MS);
  pin.allDay = true;
  pin.allDayStated = lastDay > start;
  pin.dateConfidence = 'estimated';

  const said = lead.reasoning?.trim() || `its page gives ${lead.startDate}`;
  const others = dated.slice(1);
  const agree = others.filter((r) => r.startDate === lead.startDate);
  const differ = others.filter((r) => r.startDate !== lead.startDate);
  const parts = [`Estimated: the source states no date; ${hostOf(lead.url)} (confidence ${lead.confidence}) ${said.replace(/[.\s]+$/, '')}.`];
  if (agree.length) parts.push(`Agreeing: ${agree.map((r) => hostOf(r.url)).join(', ')}.`);
  if (differ.length) parts.push(`Differing: ${differ.map((r) => `${hostOf(r.url)} (${r.startDate})`).join(', ')}.`);
  pin.dateConfidenceReasoning = parts.join(' ');
  return true;
}
