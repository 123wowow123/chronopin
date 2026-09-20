// The world's dated sporting calendar as pins, from Wikipedia's REST summary
// API (free, no key, but see the pacing note below).
//
// Governing bodies award tournaments a decade ahead and Wikipedia carries the
// dates in a quotable opening sentence, which makes this the vertical that
// best fills the far calendar: the corpus thins to single figures a month
// after mid-2027 and almost every entry below lands after that.
//
// The list is curated rather than discovered. There is no keyless index of
// "every major tournament", and the ones worth a pin are a knowable set, so
// each entry names its article, the venue whose article carries coordinates,
// and the body that runs it. A tournament spread over several countries with
// no opening venue announced is placed at the lead host's flagship ground and
// the pin says so.
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run sports:tournaments
//   npm run sports:tournaments -- --dry-run        list what would happen
//   npm run sports:tournaments -- --refresh        re-save the pins it owns

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    limit: { type: 'string', default: '40' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

const UA = { 'User-Agent': 'chronopin (sport fixtures; contact via chronopin.app)' };

type Entry = {
  article: string;
  venue: string;        // the Wikipedia article whose summary carries coordinates
  venueQuery?: string;  // how to ask a geocoder for it, when the article has no coordinates
  assumed?: boolean;    // true when the venue is a stand-in, not the announced one
  body: string;         // the governing body, which becomes the pin's company
  bodyWiki: string;
  verb?: string;        // "Kicks Off" unless the sport wants another word
  tags: string[];
};

// Each venue below is either the announced opening venue or, where none has
// been announced, the lead host's flagship ground - marked `assumed` so the
// pin can say which it is.
const TOURNAMENTS: Entry[] = [
  { article: '2027 Cricket World Cup', venue: 'Wanderers Stadium', assumed: true, body: 'International Cricket Council', bodyWiki: 'International_Cricket_Council', tags: ['Cricket', 'World Cup'] },
  { article: '2027 World Athletics Championships', venue: 'Beijing National Stadium', body: 'World Athletics', bodyWiki: 'World_Athletics', verb: 'Open', tags: ['Athletics'] },
  { article: '2027 Pan American Games', venue: 'National Stadium of Peru', venueQuery: 'Estadio Nacional, Lima, Peru', body: 'Panam Sports', bodyWiki: 'Panam_Sports', verb: 'Open', tags: ['Multi-sport event'] },
  { article: '2027 Africa Cup of Nations', venue: 'Moi International Sports Centre', assumed: true, body: 'Confederation of African Football', bodyWiki: 'Confederation_of_African_Football', tags: ['Football'] },
  { article: '2028 Summer Olympics', venue: 'Los Angeles Memorial Coliseum', body: 'International Olympic Committee', bodyWiki: 'International_Olympic_Committee', verb: 'Open', tags: ['Olympics', 'Multi-sport event'] },
  { article: '2028 Summer Paralympics', venue: 'Los Angeles Memorial Coliseum', body: 'International Paralympic Committee', bodyWiki: 'International_Paralympic_Committee', verb: 'Open', tags: ['Paralympics', 'Multi-sport event'] },
  { article: "2028 ICC Men's T20 World Cup", venue: 'Melbourne Cricket Ground', assumed: true, body: 'International Cricket Council', bodyWiki: 'International_Cricket_Council', tags: ['Cricket', 'World Cup'] },
  { article: '2030 FIFA World Cup', venue: 'Estadio Centenario', body: 'FIFA', bodyWiki: 'FIFA', tags: ['Football', 'World Cup'] },
  { article: '2030 Winter Olympics', venue: 'Allianz Riviera', assumed: true, body: 'International Olympic Committee', bodyWiki: 'International_Olympic_Committee', verb: 'Open', tags: ['Olympics', 'Winter sports'] },
  { article: '2030 Commonwealth Games', venue: 'Narendra Modi Stadium', assumed: true, body: 'Commonwealth Sport', bodyWiki: 'Commonwealth_Sport', verb: 'Open', tags: ['Multi-sport event'] },
  { article: '2031 Rugby World Cup', venue: 'MetLife Stadium', assumed: true, body: 'World Rugby', bodyWiki: 'World_Rugby', tags: ['Rugby union', 'World Cup'] },
  { article: "2031 FIFA Women's World Cup", venue: 'MetLife Stadium', assumed: true, body: 'FIFA', bodyWiki: 'FIFA', tags: ['Football', "Women's football", 'World Cup'] },
  { article: '2032 Summer Olympics', venue: 'Lang Park', assumed: true, body: 'International Olympic Committee', bodyWiki: 'International_Olympic_Committee', verb: 'Open', tags: ['Olympics', 'Multi-sport event'] },
  { article: '2032 Summer Paralympics', venue: 'Lang Park', assumed: true, body: 'International Paralympic Committee', bodyWiki: 'International_Paralympic_Committee', verb: 'Open', tags: ['Paralympics', 'Multi-sport event'] },
  { article: '2034 FIFA World Cup', venue: 'King Fahd Sports City', assumed: true, body: 'FIFA', bodyWiki: 'FIFA', tags: ['Football', 'World Cup'] },
  { article: '2034 Winter Olympics', venue: 'Rice–Eccles Stadium', body: 'International Olympic Committee', bodyWiki: 'International_Olympic_Committee', verb: 'Open', tags: ['Olympics', 'Winter sports'] },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Wikipedia's REST summary endpoint answers 429 after about a dozen calls in
// quick succession and stays cross for a while, so every call goes through
// here: one at a time, spaced, and backing off when it still says no.
let lastCall = 0;
async function wiki(title: string, attempt = 0): Promise<any | null> {
  const wait = 1600 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const response = await fetch(url, { headers: UA });
  if (response.status === 429 && attempt < 4) {
    const backoff = 5000 * (attempt + 1);
    console.error(`    429 on ${title}, waiting ${backoff / 1000}s`);
    await new Promise((r) => setTimeout(r, backoff));
    return wiki(title, attempt + 1);
  }
  if (!response.ok) {
    console.error(`    ${title}: ${response.status}`);
    return null;
  }
  return response.json();
}

type Dates = { start: string; end: string; confidence: 'scheduled' | 'estimated'; quote: string };

// Not every stadium article carries a coordinate template - the Narendra Modi
// Stadium and Peru's National Stadium both lack one, in the REST summary and
// in the query API alike - so the last resort is to look the ground up by
// name. One Nominatim call a second, as their terms ask.
let lastGeocode = 0;
async function geocode(name: string): Promise<{ lat: number; lon: number } | null> {
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(name)}`;
    const response = await fetch(url, { headers: UA });
    if (!response.ok) return null;
    const [hit] = (await response.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

// The article's coordinates where it has them, else the query API, else the
// ground looked up by name.
async function venueCoords(page: any, title: string, query?: string): Promise<{ lat: number; lon: number } | null> {
  if (page?.coordinates?.lat) return { lat: page.coordinates.lat, lon: page.coordinates.lon };
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&titles=${encodeURIComponent(title)}&format=json&formatversion=2`;
    const response = await fetch(url, { headers: UA });
    if (response.ok) {
      const body = (await response.json()) as { query?: { pages?: { coordinates?: { lat: number; lon: number }[] }[] } };
      const c = body.query?.pages?.[0]?.coordinates?.[0];
      if (c) return { lat: c.lat, lon: c.lon };
    }
  } catch {
    // fall through to the geocoder
  }
  return geocode(query ?? title);
}

// The opening sentence dates a tournament in one of a handful of shapes:
//   "from 4 October to 21 November 2027"   "from 23 July to 8 August 2032"
//   "from 10 to 19 September 2027"         "from 1 to 17 February 2030"
//   "from July 14 to 30, 2028"             "from August 15 to August 27, 2028"
// and sometimes only names a month, which is a date the organisers have not
// fixed yet and so is estimated.
function parseDates(extract: string, fallbackYear: number): Dates | null {
  const text = extract.replace(/\s+/g, ' ');
  const M = MONTHS.join('|');
  const Y = '(?:,? (\\d{4}))?';

  // day Month to day Month [year]
  let m = text.match(new RegExp(`from (\\d{1,2}) (${M}) to (\\d{1,2}) (${M})${Y}`, 'i'));
  if (m) return range(Number(m[5] ?? fallbackYear), m[2], Number(m[1]), m[4], Number(m[3]), m[0]);

  // day to day Month [year]
  m = text.match(new RegExp(`from (\\d{1,2}) to (\\d{1,2}) (${M})${Y}`, 'i'));
  if (m) return range(Number(m[4] ?? fallbackYear), m[3], Number(m[1]), m[3], Number(m[2]), m[0]);

  // Month day to Month day[, year]
  m = text.match(new RegExp(`from (${M}) (\\d{1,2}) to (${M}) (\\d{1,2})${Y}`, 'i'));
  if (m) return range(Number(m[5] ?? fallbackYear), m[1], Number(m[2]), m[3], Number(m[4]), m[0]);

  // Month day to day[, year]
  m = text.match(new RegExp(`from (${M}) (\\d{1,2}) to (\\d{1,2})${Y}`, 'i'));
  if (m) return range(Number(m[4] ?? fallbackYear), m[1], Number(m[2]), m[1], Number(m[3]), m[0]);

  // Only a month named, and only when the sentence is about the tournament
  // taking place rather than about anything else that happened in a month.
  // The 2034 World Cup article says "In December 2024, Saudi Arabia was
  // formally confirmed as the host", which a looser rule read as the date of
  // the tournament and pinned ten years early.
  m = text.match(new RegExp(`(?:scheduled to|planned to|will) (?:take place|be held|be played|be hosted)[^.]*? in (${M}) (\\d{4})`, 'i'));
  if (m && Number(m[2]) >= fallbackYear) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m![1].toLowerCase());
    const last = new Date(Date.UTC(Number(m[2]), month + 1, 0)).getUTCDate();
    return { start: iso(Number(m[2]), month, 1), end: iso(Number(m[2]), month, last + 1), confidence: 'estimated', quote: m[0] };
  }
  return null;
}

function iso(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString();
}

function range(year: number, startMonth: string, startDay: number, endMonth: string, endDay: number, quote: string): Dates {
  const s = MONTHS.findIndex((x) => x.toLowerCase() === startMonth.toLowerCase());
  const e = MONTHS.findIndex((x) => x.toLowerCase() === endMonth.toLowerCase());
  // A tournament that runs across New Year starts in the earlier year.
  const startYear = e < s ? year - 1 : year;
  return {
    start: iso(startYear, s, startDay),
    // An all-day pin's end is the exclusive midnight after its last day.
    end: iso(year, e, endDay + 1),
    confidence: 'scheduled',
    quote,
  };
}

async function login(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

// The same tournament pinned by hand does not carry this job's sourceUrl, so
// the fallback is the event's name in the title - but only among pins dated
// in the tournament's own year. Without that year "Summer Olympics" matched
// the 2028 pin for the 2032 games, and "FIFA World Cup" matched 2030 for
// 2034: every edition would have looked already pinned.
async function existingPin(sourceUrl: string, article: string): Promise<{ id: number; title: string; mine: boolean } | null> {
  const year = article.slice(0, 4);
  const name = article.replace(/^\d{4} /, '');
  const [row] = await db.query<{ id: number; title: string; sourceUrl: string }>(
    `SELECT "id", "title", "sourceUrl" FROM "Pin"
     WHERE "utcDeletedDateTime" IS NULL
       AND ("sourceUrl" = $1
            OR ("title" ILIKE $2 AND EXTRACT(YEAR FROM "utcStartDateTime") = $3::int))
     LIMIT 1`,
    [sourceUrl, `%${name}%`, year],
  );
  return row ? { id: row.id, title: row.title, mine: row.sourceUrl === sourceUrl } : null;
}

async function run() {
  const token = flags['dry-run'] ? '' : await login(flags.base!);
  let created = 0;
  let refreshed = 0;
  let skipped = 0;

  for (const entry of TOURNAMENTS.slice(0, Number(flags.limit))) {
    const page = await wiki(entry.article);
    if (!page?.extract) {
      console.error(`  ! ${entry.article} — no summary`);
      continue;
    }
    const sourceUrl = page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(entry.article.replace(/ /g, '_'))}`;
    const already = await existingPin(sourceUrl, entry.article);
    if (already && !(flags.refresh && already.mine)) {
      console.log(`  = ${entry.article} — already pin ${already.id} (${already.title})`);
      skipped++;
      continue;
    }
    const dates = parseDates(page.extract, Number(entry.article.slice(0, 4)));
    if (!dates) {
      console.error(`  ! ${entry.article} — no date in: ${page.extract.slice(0, 140)}`);
      continue;
    }
    const venue = await wiki(entry.venue);
    const coords = await venueCoords(venue, venue?.title ?? entry.venue, entry.venueQuery);
    if (!coords) {
      console.error(`  ! ${entry.article} — no coordinates for ${entry.venue}`);
      continue;
    }
    const body = {
      title: `${page.title} ${entry.verb ?? 'Kicks Off'}`.slice(0, 90),
      description: [
        page.extract.split('. ').slice(0, 2).join('. ').slice(0, 600),
        entry.assumed
          ? `No opening venue has been announced, so this pin sits at ${venue?.title ?? entry.venue}, the lead host's flagship ground.`
          : `The pin sits at ${venue?.title ?? entry.venue}.`,
      ].join(' '),
      sourceUrl,
      allDay: true,
      utcStartDateTime: dates.start,
      utcEndDateTime: dates.end,
      dateConfidence: dates.confidence,
      dateConfidenceReasoning:
        `Wikipedia's article dates it "${dates.quote}".` +
        (dates.confidence === 'estimated'
          ? ' Only the month is fixed so far, so the pin covers the whole of it.'
          : ''),
      latitude: coords.lat,
      longitude: coords.lon,
      address: venue?.title ?? entry.venue,
      company: entry.body,
      companyWikiUrl: `https://en.wikipedia.org/wiki/${entry.bodyWiki}`,
      categories: ['Sports'],
      tags: entry.tags,
      media: [page.originalimage?.source, venue?.originalimage?.source].filter(Boolean).slice(0, 2).map((originalUrl: string) => ({ type: 1, originalUrl })),
      references: [
        {
          url: venue?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(entry.venue.replace(/ /g, '_'))}`,
          title: `${venue?.title ?? entry.venue} - Wikipedia`,
          confidence: 80,
          publishedDate: null,
          startDate: null,
          endDate: null,
          reasoning: `The ground this pin is placed at${entry.assumed ? ', standing in until an opening venue is announced' : ', the announced opening venue'}; its article carries the coordinates and capacity.`,
        },
      ],
    };
    console.log(`  ${already ? '~' : '+'} ${dates.start.slice(0, 10)} ${body.title} — ${venue?.title ?? entry.venue} (${coords.lat}, ${coords.lon})${dates.confidence === 'estimated' ? ' [month only]' : ''}`);
    if (flags['dry-run']) continue;
    const response = await fetch(`${flags.base}/api/pins${already ? `/${already.id}` : ''}`, {
      method: already ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`    ${response.status}: ${(await response.text()).slice(0, 300)}`);
      continue;
    }
    if (already) refreshed++;
    else created++;
  }
  console.log(`${created} created, ${refreshed} refreshed, ${skipped} already pinned${flags['dry-run'] ? ' (dry run)' : ''}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
