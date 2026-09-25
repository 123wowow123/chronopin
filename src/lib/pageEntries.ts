// A page that lists many dated entries - release notes, a changelog, a
// news timeline - read as one pin per entry rather than one for the page.
// The scrape (server/scrape/inPage.ts) hands over the page's headings with
// the text under each; pageEntries picks the dated ones out, and
// entryToPin turns an entry into a POST /api/pins body. Pins are posted
// oldest first, so the model-line and prequel rules thread each onto the
// one before it (server/scrape/modelSeries.ts, prequel.ts).

import type { ScrapedStock } from './stocks';
import type { MediumJson } from './types';
import { splitSentences } from './sentences';

export type EntryImage = { originalUrl: string; width: number; height: number };

// A heading as the page shows it, with what is under it up to the next
// heading of any level.
export type PageHeading = {
  level: number;
  text: string;
  // Its id (or a nearby one) for a link straight to it; '' when it has none.
  anchor: string;
  body: string;
  // A <time datetime> under it, for pages that date entries that way.
  time?: string;
  images: EntryImage[];
};

export type PageEntry = {
  // The entry's own link: the page with its anchor.
  url: string;
  heading: string;
  title: string;
  // YYYY-MM-DD, null when the page gives the entry no date.
  startDate: string | null;
  text: string;
  images: EntryImage[];
  // The live pin that already has this entry's link.
  existing?: { id: number; title: string };
};

// Fewer dated headings than this is an article with a date or two in it,
// not a list of entries.
export const MIN_DATED_ENTRIES = 3;
const MAX_TEXT = 4000;
const TITLE_MAX = 180;
const DESCRIPTION_MAX = 300;
const SUMMARY_ITEMS = 6;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?`;
const DAY = String.raw`(\d{1,2})(?:st|nd|rd|th)?`;
const YEAR = String.raw`(\d{4})`;
// "July 9, 2026", "Sep 15, 2025", "February, 27, 2025"; "9 July 2026"; "2026-07-09".
const MONTH_FIRST = new RegExp(String.raw`\b${MONTH},?\s+${DAY},?\s+${YEAR}\b`, 'i');
const DAY_FIRST = new RegExp(String.raw`\b${DAY}\s+${MONTH},?\s+${YEAR}\b`, 'i');
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/;

function dayKey(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

const monthNumber = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;

// The first whole date written in text, as YYYY-MM-DD.
export function parseDay(text: string | null | undefined): string | null {
  if (!text) return null;
  const found = [
    ((m) => m && { at: m.index, day: dayKey(+m[3], monthNumber(m[1]), +m[2]) })(MONTH_FIRST.exec(text)),
    ((m) => m && { at: m.index, day: dayKey(+m[3], monthNumber(m[2]), +m[1]) })(DAY_FIRST.exec(text)),
    ((m) => m && { at: m.index, day: dayKey(+m[1], +m[2], +m[3]) })(ISO.exec(text)),
  ].filter((f): f is { at: number; day: string | null } => !!f?.day);
  return found.sort((a, b) => a.at - b.at)[0]?.day ?? null;
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

// A heading without its date: "Update to GPT-4o (April 29, 2025)" is
// "Update to GPT-4o". A heading that is only a date leaves ''.
export function cleanTitle(heading: string): string {
  let title = squash(heading).replace(/\s*\(([^)]*)\)/g, (whole, inner: string) => (parseDay(inner) ? '' : whole));
  const date = new RegExp(String.raw`(?:${MONTH_FIRST.source}|${DAY_FIRST.source}|${ISO.source})`, 'i');
  title = title
    .replace(new RegExp(String.raw`\s*[-–—:|·,]?\s*${date.source}\s*$`, 'i'), '')
    .replace(new RegExp(String.raw`^\s*${date.source}\s*[-–—:|·,]?\s*`, 'i'), '');
  return squash(title).replace(/[\s:,–—-]+$/, '');
}

const firstLine = (text: string) => text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';

// The page date of a heading: in its text, else a <time> under it, else a
// short first line under it ("March 3, 2026" beneath "v2.4.0").
function headingDay(h: PageHeading): string | null {
  const line = firstLine(h.body);
  return parseDay(h.text) ?? parseDay(h.time) ?? (line.length <= 60 ? parseDay(line) : null);
}

// A link to the entry itself: its anchor, else a text fragment on its
// heading (Chrome and Safari scroll to it), so no two entries share a link.
export function entryUrl(pageUrl: string, heading: PageHeading): string {
  const base = pageUrl.split('#')[0];
  if (heading.anchor) return `${base}#${encodeURIComponent(heading.anchor)}`;
  const text = squash(heading.text).slice(0, 80);
  return `${base}#:~:text=${encodeURIComponent(text).replace(/-/g, '%2D')}`;
}

// The page's dated entries in page order, or none when it is not a list of
// them. An undated heading between them counts as an entry too when it is
// at the level of the entry before it (the page just left its date out);
// one below that level is part of that entry.
export function pageEntries(pageUrl: string, headings: PageHeading[]): PageEntry[] {
  const days = headings.map(headingDay);
  const dated = days.flatMap((d, i) => (d ? [i] : []));
  if (dated.length < MIN_DATED_ENTRIES) return [];
  const [first, last] = [dated[0], dated[dated.length - 1]];

  const entries: { heading: PageHeading; day: string | null; parts: string[]; images: EntryImage[] }[] = [];
  for (let i = first; i < headings.length; i++) {
    const h = headings[i];
    const current = entries[entries.length - 1];
    const startsEntry = days[i] != null || (i < last && h.level <= current.heading.level);
    if (startsEntry) {
      entries.push({ heading: h, day: days[i], parts: [h.body], images: [...h.images] });
    } else if (h.level > current.heading.level) {
      current.parts.push(h.text, h.body);
      current.images.push(...h.images);
    } else {
      break;
    }
  }

  return entries.map(({ heading, day, parts, images }) => {
    const text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);
    const title = cleanTitle(heading.text) || firstSentence(text).slice(0, TITLE_MAX);
    return { url: entryUrl(pageUrl, heading), heading: squash(heading.text), title: title.slice(0, TITLE_MAX), startDate: day, text, images: dedupeImages(images) };
  });
}

function dedupeImages(images: EntryImage[]) {
  return images.filter((img, i) => images.findIndex((o) => o.originalUrl === img.originalUrl) === i);
}

function sentences(text: string): string[] {
  return text.split('\n').flatMap((line) => splitSentences(squash(line)));
}

export function firstSentence(text: string): string {
  const [sentence = ''] = sentences(text);
  return sentence.length > DESCRIPTION_MAX ? `${sentence.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : sentence;
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The rest of the entry after its first sentence, as a short list.
export function entrySummary(text: string): string | undefined {
  const rest = sentences(text).slice(1, 1 + SUMMARY_ITEMS);
  return rest.length ? `<ul>${rest.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : undefined;
}

// Oldest first, the order they are posted in. Entries of one day keep the
// order they happened in: reversed page order on a newest-first page.
export function creationOrder<T extends Pick<PageEntry, 'startDate'>>(entries: T[]): T[] {
  const days = entries.map((e) => e.startDate).filter((d): d is string => !!d);
  const newestFirst = days.length > 1 && days[0] > days[days.length - 1];
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.startDate ?? '').localeCompare(b.entry.startDate ?? '') || (newestFirst ? b.index - a.index : a.index - b.index))
    .map(({ entry }) => entry);
}

export type EntryReference = { url: string; title: string; confidence: number; startDate?: string; publishedDate?: string; reasoning: string };

// What every entry's pin shares with the pin the form is drafting: who it is
// about and how it is filed, which the author fixes once for them all.
export type EntryShared = {
  company?: string;
  companyWikiUrl?: string;
  categories?: string[];
  stocks?: ScrapedStock[];
  tags?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
};

// A POST /api/pins body for an entry, with the title and day the author
// settled on. pageDay: the day the page gives, cited as the reference's date;
// a day the author typed for an undated entry is theirs, not the page's.
export function entryToPin(
  entry: Pick<PageEntry, 'url' | 'heading' | 'text' | 'images'> & { title: string; startDate: string; pageDay: string | null },
  shared: EntryShared,
  pageTitle: string,
) {
  const reasoning = entry.pageDay ? `The page dates this entry ${entry.pageDay}.` : undefined;
  const media: MediumJson[] = entry.images.map((img) => ({ type: 1, originalUrl: img.originalUrl, originalWidth: img.width, originalHeight: img.height }));
  return {
    ...shared,
    title: entry.title.trim().slice(0, TITLE_MAX),
    description: escapeHtml(firstSentence(entry.text)) || undefined,
    longFormSummary: entrySummary(entry.text),
    sourceUrl: entry.url,
    utcStartDateTime: `${entry.startDate}T00:00:00.000Z`,
    allDay: true,
    dateConfidence: entry.pageDay ? 'confirmed' : undefined,
    dateConfidenceReasoning: reasoning,
    references: <EntryReference[]>[
      {
        url: entry.url,
        title: `${pageTitle ? `${squash(pageTitle)}: ` : ''}${entry.heading}`.slice(0, 1024),
        confidence: entry.pageDay ? 90 : 70,
        startDate: entry.pageDay ?? undefined,
        reasoning: reasoning ?? 'The entry this pin was made from; the page gives it no date.',
      },
    ],
    media,
  };
}
