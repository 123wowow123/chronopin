// Central solar eclipses as pins, from NASA's eclipse catalogue
// (eclipse.gsfc.nasa.gov, free, no key, no rate limit worth the name).
//
// This is the one vertical whose calendar is already written to the second for
// the next thousand years, which makes it the answer to the timeline's thinnest
// stretch: the corpus has about one pin a year after 2030, and a decade page
// here yields two or three eclipses a year, each with a precise instant and a
// precise place.
//
// Only central eclipses are pinned - total, annular and hybrid. A partial
// eclipse has no central path, so NASA publishes no point of greatest eclipse
// for it and there is nowhere to put the pin; it is also the kind nobody
// travels for. Every pin sits at the point of greatest eclipse, taken from the
// eclipse's own path table, which is a real coordinate on the Earth and often
// in the middle of an ocean.
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run astronomy:eclipses
//   npm run astronomy:eclipses -- --dry-run          list what would happen
//   npm run astronomy:eclipses -- --refresh          re-save the pins it owns
//   npm run astronomy:eclipses -- --decades 2031,2041
//   npm run astronomy:eclipses -- --limit 10

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    decades: { type: 'string', default: '2021,2031,2041' },
    limit: { type: 'string', default: '60' },
    from: { type: 'string', default: '' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

const UA = { 'User-Agent': 'chronopin (astronomy eclipses; contact via chronopin.app)' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The decade pages are split every ten years (SEdecade2021, SEdecade2031...)
// but the per-eclipse path, map and plot files are filed by century, so every
// eclipse from 2001 to 2100 sits under the same "2001" directory.
const CENTURY = '2001';

// NASA writes its regions in a telegraphic shorthand built for a fixed-width
// table - "n N. America", "s Pacific", "midwest US", "N.Z." - which reads
// badly in a sentence. These turn it back into English.
const PLACES: [RegExp, string][] = [
  [/\bN\. America\b/g, 'North America'],
  [/\bS\. America\b/g, 'South America'],
  [/\bC\. America\b/g, 'Central America'],
  [/\bN\.Z\.?\b/g, 'New Zealand'],
  [/\bE\. Indies\b/g, 'the East Indies'],
  [/\bMid East\b/g, 'the Middle East'],
  [/\bUS\b/g, 'the United States'],
  [/\bUK\b/g, 'the United Kingdom'],
];
const COMPASS: Record<string, string> = { n: 'northern', s: 'southern', e: 'eastern', w: 'western', ne: 'northeastern', nw: 'northwestern', se: 'southeastern', sw: 'southwestern', c: 'central' };
// A direction in front of an ocean is part of its name, not a description of
// part of it: the South Pacific, not the southern Pacific.
const SEAS = /\b(pacific|atlantic|indian ocean|arctic|southern ocean|caribbean|mediterranean)\b/i;
const CARDINAL: Record<string, string> = { n: 'North', s: 'South', e: 'East', w: 'West', ne: 'Northeast', nw: 'Northwest', se: 'Southeast', sw: 'Southwest', c: 'Central' };
// Names that read with a definite article. The continents do not - "the South
// America" - so they are named here rather than matched on their direction.
const ARTICLE_NAMES = /^(united states|united kingdom|philippines|netherlands|maldives|bahamas|middle east|east indies|azores|canaries)\b/i;

// A comma-separated NASA region list, each part turned back into English.
function regions(list: string): string {
  const parts = list.split(',').map((part) => named(part)).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function named(region: string): string {
  let text = region.trim();
  for (const [re, to] of PLACES) text = text.replace(re, to);
  // NASA pairs directions with an ampersand for a region that spans two of
  // them ("w & s Africa"), and only the last carries the place name.
  const pair = text.match(/^([a-z]{1,2})\s*&\s*([a-z]{1,2})\s+(.*)$/i);
  if (pair && COMPASS[pair[1].toLowerCase()] && COMPASS[pair[2].toLowerCase()]) {
    const sea = SEAS.test(pair[3]);
    const first = sea ? CARDINAL[pair[1].toLowerCase()] : COMPASS[pair[1].toLowerCase()];
    const second = sea ? CARDINAL[pair[2].toLowerCase()] : COMPASS[pair[2].toLowerCase()];
    text = `${first} and ${second} ${pair[3]}`;
  } else {
    // A single leading direction token, lower case in NASA's table.
    const lead = text.match(/^(n|s|e|w|ne|nw|se|sw|c|midwest)\s+(.*)$/i);
    if (lead) {
      const rest = lead[2];
      const key = lead[1].toLowerCase();
      if (key === 'midwest') text = `the midwestern ${rest}`.replace('the midwestern the ', 'the midwestern ');
      else if (SEAS.test(rest)) text = `${CARDINAL[key]} ${rest}`;
      else text = `${COMPASS[key]} ${rest}`;
    }
  }
  if (/^the /i.test(text)) return text;
  if (ARTICLE_NAMES.test(text)) return `the ${text}`;
  // An ocean takes an article; a continent that merely starts with a compass
  // word ("South America") does not.
  if (SEAS.test(text) && !/\bamerica\b/i.test(text)) return `the ${text}`;
  return text;
}

type Eclipse = {
  date: string;          // 2027-08-02
  stamp: string;         // NASA's own "2027Aug02"
  time: string;          // 10:06:37 UT, the instant of greatest eclipse
  type: 'Total' | 'Annular' | 'Hybrid';
  saros: string;
  magnitude: string;
  duration: string;      // 06m23s
  visibility: string;    // the whole region that sees any of it
  central: string;       // the countries the central path crosses
  pathUrl: string;
  mapUrl: string;
  plotUrl: string;
};

type GreatestEclipse = { latitude: number; longitude: number; width: string; duration: string; time: string; exact: boolean };

// A few path pages are stubs with no table at all - every one of them a
// non-central eclipse, where the shadow's axis misses the Earth and only the
// edge of the umbra grazes it, so there is no central line to tabulate. The
// five-millennium catalogue still carries their point of greatest eclipse,
// but only to the whole degree, which is about 110 km. One page covers the
// century, so it is fetched once and only when something needs it.
let catalogue: Map<string, GreatestEclipse> | null = null;
async function fromCatalogue(date: string): Promise<GreatestEclipse | null> {
  if (!catalogue) {
    catalogue = new Map();
    const response = await fetch(`https://eclipse.gsfc.nasa.gov/SEcat5/SE${CENTURY}-2100.html`, { headers: UA });
    if (response.ok) {
      const text = (await response.text()).replace(/<[^>]+>/g, '');
      for (const line of text.split('\n')) {
        // 09603  2043 Apr 09  18:57:49   87  535  149  T+  t-  1.0031  1.0095  61N 152E   0
        const m = line.match(/^\s*\d{5}\s+(\d{4})\s+([A-Z][a-z]{2})\s+(\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?\d+)\s+\S+\s+(\d+)\s+\S+\s+\S+\s+[\d.-]+\s+[\d.]+\s+(\d+)([NS])\s+(\d+)([EW])\s+\S*\s*(\d*)\s*(\d*m[\d.]*s)?/);
        if (!m) continue;
        const month = MONTHS.indexOf(m[2]);
        if (month < 0) continue;
        const day = `${m[1]}-${String(month + 1).padStart(2, '0')}-${m[3]}`;
        // The catalogue's clock is TD; delta-T turns it into the UT a clock reads.
        const td = new Date(`${day}T${m[4]}Z`).getTime();
        const ut = new Date(td - Number(m[5]) * 1000).toISOString().slice(11, 19);
        catalogue.set(day, {
          latitude: Number(m[7]) * (m[8] === 'S' ? -1 : 1),
          longitude: Number(m[9]) * (m[10] === 'W' ? -1 : 1),
          width: m[11] || '',
          duration: m[12] || '',
          time: ut,
          exact: false,
        });
      }
    }
  }
  return catalogue.get(date) ?? null;
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// "2027 Aug 02" -> { date: "2027-08-02", stamp: "2027Aug02" }
function parseDate(text: string): { date: string; stamp: string } | null {
  const m = text.match(/(\d{4})\s+([A-Z][a-z]{2})\s+(\d{2})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return { date: `${m[1]}-${String(month + 1).padStart(2, '0')}-${m[3]}`, stamp: `${m[1]}${m[2]}${m[3]}` };
}

async function fetchDecade(decade: string): Promise<Eclipse[]> {
  const url = `https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade${decade}.html`;
  const response = await fetch(url, { headers: UA });
  if (!response.ok) {
    console.error(`  ${decade}: ${response.status}`);
    return [];
  }
  const html = await response.text();
  const out: Eclipse[] = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(([, c]) => c);
    if (cells.length < 7) continue;
    const when = parseDate(strip(cells[0]));
    if (!when) continue;
    const type = strip(cells[2]);
    if (type !== 'Total' && type !== 'Annular' && type !== 'Hybrid') continue;
    // The last cell carries the whole visibility region and, in bold, the
    // countries the central path itself crosses - the ones worth naming.
    const region = strip(cells[6]);
    const central = cells[6].match(/<strong>\s*\[[^:]+:\s*(.*?)\]\s*<\/strong>/s);
    const letter = type[0];
    out.push({
      ...when,
      time: strip(cells[1]),
      type,
      saros: strip(cells[3]),
      magnitude: strip(cells[4]),
      duration: strip(cells[5]),
      visibility: central ? region.replace(/\[.*\]/, '').trim() : region,
      central: central ? strip(central[1]) : '',
      pathUrl: `https://eclipse.gsfc.nasa.gov/SEpath/SEpath${CENTURY}/SE${when.stamp}${letter}path.html`,
      mapUrl: `https://eclipse.gsfc.nasa.gov/SEgoogle/SEgoogle${CENTURY}/SE${when.stamp}${letter}google.html`,
      plotUrl: `https://eclipse.gsfc.nasa.gov/SEplot/SEplot${CENTURY}/SE${when.stamp}${letter}.GIF`,
    });
  }
  return out;
}

// NASA's path table ends with the instant of greatest eclipse in degrees and
// decimal minutes ("Lat = 25 30.3'N  Long = 033 11.0'E"), which is the pin's
// place: the point on Earth closest to the axis of the Moon's shadow.
async function greatestEclipse(e: Eclipse): Promise<GreatestEclipse | null> {
  const response = await fetch(e.pathUrl, { headers: UA });
  if (!response.ok) return null;
  const text = strip(await response.text()).replace(/&#\d+;/g, "'").replace(/[´’]/g, "'");
  const m = text.match(/Lat\s*=\s*(\d+)\D+([\d.]+)'?\s*([NS])\s*Long\s*=\s*(\d+)\D+([\d.]+)'?\s*([EW])/);
  if (!m) return null;
  const lat = (Number(m[1]) + Number(m[2]) / 60) * (m[3] === 'S' ? -1 : 1);
  const lon = (Number(m[4]) + Number(m[5]) / 60) * (m[6] === 'W' ? -1 : 1);
  const width = text.match(/Path Width\s*=\s*([\d.]+)\s*km/);
  const duration = text.match(/Central Duration\s*=\s*(\d+m[\d.]+s)/);
  // The decade table's clock is TD, the uniform dynamical timescale; this page
  // gives the same instant in UT, which is what a clock at the eclipse reads.
  // They differ by delta-T, about 72 seconds this century and growing.
  const ut = text.match(/Greatest Eclipse\s*:\s*Time\s*=\s*(\d{2}:\d{2}:\d{2})/);
  return {
    latitude: Number(lat.toFixed(4)),
    longitude: Number(lon.toFixed(4)),
    width: width?.[1] ?? '',
    duration: duration?.[1] ?? e.duration,
    time: ut?.[1] ?? e.time,
    exact: true,
  };
}

// The greatest-eclipse point is as often at sea as on land, so the label is
// whatever Nominatim can name there and the NASA region when it can name
// nothing. One call a second, as their terms ask.
let lastGeocode = 0;
async function placeName(lat: number, lon: number): Promise<{ label: string; country: string | null } | null> {
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}&zoom=5`;
    const response = await fetch(url, { headers: UA });
    if (!response.ok) return null;
    const body = (await response.json()) as { display_name?: string; address?: Record<string, string> };
    if (!body.display_name) return null;
    const a = body.address ?? {};
    const region = a.state ?? a.region ?? a.province ?? a.county ?? null;
    const country = a.country ?? null;
    return { label: [region, country].filter(Boolean).join(', ') || body.display_name, country };
  } catch {
    return null;
  }
}

function clean(duration: string): string {
  const m = duration.match(/(\d+)m([\d.]+)s/);
  if (!m) return duration;
  const minutes = Number(m[1]);
  const seconds = Math.round(Number(m[2]));
  return `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'}`;
}

function pinBody(e: Eclipse, ge: GreatestEclipse, place: { label: string; country: string | null } | null) {
  const where = e.central || e.visibility;
  const first = where.split(',')[0].trim();
  const kind = e.type === 'Hybrid' ? 'Hybrid Solar Eclipse' : `${e.type} Solar Eclipse`;
  // The path crosses many countries and NASA lists them west to east, so the
  // first of them is where the shadow lands, not where the eclipse is deepest.
  // Name the country holding the point of greatest eclipse when there is one -
  // that is where the pin sits and where the eclipse is longest - and fall
  // back to the head of NASA's list when that point is at sea.
  const title = `${kind} Crosses ${named(place?.country ?? first)}`;
  return {
    title: title.slice(0, 90),
    description:
      `The Moon's shadow touches down at ${ge.time} UT on ${e.date}, and the ${e.type.toLowerCase()} phase lasts up to ${clean(ge.duration)} ` +
      `along a path ${ge.width ? `${ge.width} km wide` : 'across the Earth'}${where ? ` crossing ${regions(where)}` : ''}. ` +
      `A partial eclipse is visible from ${regions(e.visibility)}.`,
    sourceUrl: e.pathUrl,
    allDay: false,
    utcStartDateTime: new Date(`${e.date}T${ge.time.length === 8 ? ge.time : '00:00:00'}Z`).toISOString(),
    utcEndDateTime: null,
    dateConfidence: 'scheduled',
    dateConfidenceReasoning:
      `NASA's eclipse catalogue gives the instant of greatest eclipse as ${ge.time} UT on ${e.date} (${e.time} TD, the two separated by delta-T), from Saros series ${e.saros}. ` +
      `Eclipse circumstances are computed from orbital mechanics, so the date and time are exact centuries ahead.` +
      (ge.exact ? '' : ' This eclipse is non-central and has no published path table, so its place is the catalogue position, good to the whole degree.'),
    latitude: ge.latitude,
    longitude: ge.longitude,
    address: place?.label ?? `Point of greatest eclipse at sea${where ? `, off ${named(first)}` : ''}`,
    categories: ['Space & Astronomy'],
    tags: ['Solar eclipse', e.type, `Saros ${e.saros}`].filter(Boolean),
    media: [{ type: 1, originalUrl: e.plotUrl }],
    references: [
      {
        url: e.mapUrl,
        title: `${e.type} Solar Eclipse of ${e.date} - Google map of the path`,
        confidence: 90,
        publishedDate: null,
        startDate: null,
        endDate: null,
        reasoning: "NASA's interactive map of this eclipse, showing the central path, the points of greatest eclipse and greatest duration, and local circumstances anywhere on the map.",
      },
      {
        url: `https://eclipse.gsfc.nasa.gov/SEsaros/SEsaros${e.saros}.html`,
        title: `Saros series ${e.saros}`,
        confidence: 80,
        publishedDate: null,
        startDate: null,
        endDate: null,
        reasoning: `The saros series this eclipse belongs to, listing every eclipse in the same 18-year family and where each one fell.`,
      },
    ],
  };
}

async function login(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

// An eclipse already pinned by hand does not carry this job's sourceUrl, so
// the identity test is the day itself: one central eclipse can fall on a given
// date, and a live pin that day whose title says eclipse is that eclipse.
async function existingPin(date: string, sourceUrl: string): Promise<{ id: number; title: string; mine: boolean } | null> {
  const [row] = await db.query<{ id: number; title: string; sourceUrl: string }>(
    `SELECT "id", "title", "sourceUrl" FROM "Pin"
     WHERE "utcDeletedDateTime" IS NULL AND "title" ~* '\\meclipse\\M'
       AND "utcStartDateTime" >= $1::date AND "utcStartDateTime" < $1::date + 1 LIMIT 1`,
    [date],
  );
  return row ? { id: row.id, title: row.title, mine: row.sourceUrl === sourceUrl } : null;
}

async function run() {
  const today = flags.from || new Date().toISOString().slice(0, 10);
  const all: Eclipse[] = [];
  for (const decade of flags.decades!.split(',').map((d) => d.trim()).filter(Boolean)) {
    all.push(...(await fetchDecade(decade)));
  }
  const upcoming = all.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, Number(flags.limit));
  console.log(`${all.length} central solar eclipse(s) in the catalogue, ${upcoming.length} still to come from ${today}`);

  const token = flags['dry-run'] ? '' : await login(flags.base!);
  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  for (const e of upcoming) {
    const already = await existingPin(e.date, e.pathUrl);
    // A pin this job did not write (an eclipse pinned by hand) is left alone
    // even under --refresh: it is somebody else's pin about the same event.
    if (already && !(flags.refresh && already.mine)) {
      console.log(`  = ${e.date} ${e.type} — already pin ${already.id} (${already.title})`);
      skipped++;
      continue;
    }
    const ge = (await greatestEclipse(e)) ?? (await fromCatalogue(e.date));
    if (!ge) {
      console.error(`  ! ${e.date} ${e.type} — no point of greatest eclipse in ${e.pathUrl} or the catalogue`);
      continue;
    }
    const place = await placeName(ge.latitude, ge.longitude);
    const body = pinBody(e, ge, place);
    console.log(`  ${already ? '~' : '+'} ${e.date} ${body.title} — ${ge.latitude}, ${ge.longitude} (${place?.label ?? 'at sea'})`);
    if (flags['dry-run']) continue;
    // A refresh is a PUT of the whole pin, so the live feed, search and the
    // page caches hear about it; the route re-saves media and references
    // wholesale, which is why the body carries them every time.
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
