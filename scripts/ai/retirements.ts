// The day an AI model stops answering, as pins, from the vendors' own
// deprecation pages (keyless, plain HTTP).
//
// `AI Models` was the worst-shaped category in the corpus: 45 pins and 2 of
// them ahead of today. The reason is that nobody announces a model launch in
// advance - but they all announce a model's *death* in advance, because
// developers have to migrate. A shutdown date is a real dated event with
// consequences, published months out, and revised in public.
//
// One pin per announcement, not per model. Seventeen snapshots switched off on
// one morning is one event; the models are its content. That also solves the
// source URL, because each announcement has its own anchor on the page - the
// same problem the Nobel schedule page had, with the same kind of answer.
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run ai:retirements
//   npm run ai:retirements -- --dry-run       list what would happen
//   npm run ai:retirements -- --refresh       re-save the pins it owns

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { lookupStudioLocation } from '@/server/studioLocation';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    from: { type: 'string', default: '' },
    limit: { type: 'string', default: '40' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' };

type Vendor = { name: string; url: string; wiki: string; note: string };

// Only vendors whose page gives each announcement its own anchor are here.
// Anthropic's and Azure's future retirements live in one status table with a
// single anchor for the lot, so they cannot yet have a pin each; see the
// scraping notes.
const VENDORS: Vendor[] = [
  {
    name: 'OpenAI',
    url: 'https://platform.openai.com/docs/deprecations',
    wiki: 'https://en.wikipedia.org/wiki/OpenAI',
    note: 'the San Francisco lab behind GPT, Sora and the OpenAI API',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Dates on these pages are written "Dec 11, 2026", "October 23, 2026" or
// "2026-09-24", and some carry a non-breaking hyphen that looks like a hyphen
// and is not one.
function isoDate(text: string): string | null {
  const s = text.replace(/[‐-―]/g, '-').trim();
  const plain = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) return s;
  const named = s.match(/^([A-Z][a-z]{2})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})$/);
  if (!named) return null;
  const month = MONTHS.indexOf(named[1]);
  if (month < 0) return null;
  return `${named[3]}-${String(month + 1).padStart(2, '0')}-${String(Number(named[2])).padStart(2, '0')}`;
}

type Announcement = {
  vendor: Vendor;
  anchor: string;
  heading: string;      // "2026-06-11: GPT-5 and o3 model deprecations"
  announced: string;    // the anchor's own date
  shutdown: string;     // the last date anything in it goes away
  items: string[];      // the models or systems being switched off
  prose: string;        // the vendor's own sentence, for the reasoning
};

async function fetchAnnouncements(vendor: Vendor): Promise<Announcement[]> {
  const response = await fetch(vendor.url, { headers: UA, redirect: 'follow' });
  if (!response.ok) {
    console.error(`  ${vendor.name}: ${response.status}`);
    return [];
  }
  const page = await response.text();
  const out: Announcement[] = [];
  // Each announcement is an h3 whose id begins with its date; its section runs
  // to the next heading.
  for (const [, anchor, head, body] of page.matchAll(/<h3[^>]*id="([^"]+)"[^>]*>(.*?)<\/h3>([\s\S]*?)(?=<h[23]|$)/g)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(anchor)) continue;
    const dates: string[] = [];
    const items: string[] = [];
    for (const [, row] of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, c]) => strip(c));
      if (!cells.length) continue;
      const when = isoDate(cells[0]);
      if (!when) continue;
      dates.push(when);
      // The second column is usually a model id, but a staged platform
      // shutdown (Evals, Agent Builder, reusable prompts) puts a sentence
      // there instead - "The Evals dashboard and API are scheduled to shut
      // down." Counting those sentences as models made a three-milestone
      // rollout read as "3 Evals Platform". An identifier has no trailing full
      // stop and no more than three words.
      // The cell holds the row's model and then its aliases, so the item is
      // the first identifier in it: "gpt-4-turbo | gpt-4-turbo-2024-04-09,
      // gpt-4-turbo-completions" is one model going away, not three.
      const primary = (cells[1] ?? '').split(/[|,]/)[0].trim();
      const identifier = primary && primary.length < 60 && !/\.$/.test(primary) && primary.split(/\s+/).length <= 3;
      if (identifier && /[a-z0-9]/i.test(primary)) items.push(primary);
    }
    if (!dates.length) continue;
    out.push({
      vendor,
      anchor,
      heading: strip(head),
      announced: anchor.slice(0, 10),
      // The pin is the day the last of them actually goes: a staged shutdown
      // ends on its final date.
      shutdown: dates.sort()[dates.length - 1],
      items: [...new Set(items)],
      prose: strip(body).slice(0, 700),
    });
  }
  return out;
}

// "2026-06-11: GPT-5 and o3 model deprecations" -> "GPT-5 and o3 models"
function subject(a: Announcement): string {
  return a.heading
    .replace(/^\d{4}-\d{2}-\d{2}:\s*/, '')
    .replace(/\s*deprecations?$/i, '')
    .trim();
}

// Title case for a headline, leaving alone anything the vendor spells its own
// way: a model id carries digits or hyphens (gpt-5.4-cyber, o3, Sora 2), and
// the small words stay small unless they lead.
const SMALL = /^(a|an|and|the|for|of|to|in|on|or|with)$/i;
function headline(text: string): string {
  return text
    .split(' ')
    .map((word, i) => {
      if (/[\d-]/.test(word) || /[a-z][A-Z]/.test(word)) return word;
      if (i > 0 && SMALL.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Two announcements a year apart share the heading "Legacy GPT model
// snapshots", so the count is what tells them apart as well as what says how
// big the event is.
function title(a: Announcement): string {
  let what = headline(subject(a));
  // "GPT Image model deprecations" leaves "GPT Image Model", which reads wrong
  // in front of a count.
  if (a.items.length > 1) what = what.replace(/\b(Model|Snapshot|Endpoint|Service)$/i, (w) => `${w}s`);
  return (a.items.length > 1 ? `${a.vendor.name} Retires ${a.items.length} ${what}` : `${a.vendor.name} Retires ${what}`).slice(0, 90);
}

function readableDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

type Place = Awaited<ReturnType<typeof lookupStudioLocation>>;

function pinBody(a: Announcement, place: Place) {
  const list = a.items.slice(0, 12).join(', ');
  const more = a.items.length > 12 ? ` and ${a.items.length - 12} more` : '';
  const day = new Date(`${a.shutdown}T00:00:00.000Z`);
  return {
    title: title(a),
    description:
      `${a.vendor.name} switches off ${a.items.length > 1 ? `${a.items.length} models and endpoints` : subject(a)} on ${readableDate(a.shutdown)}; ` +
      `requests to them stop working and callers have to move to the named replacements. ` +
      (list ? `Going: ${list}${more}.` : ''),
    sourceUrl: `${a.vendor.url}#${a.anchor}`,
    allDay: true,
    utcStartDateTime: day.toISOString(),
    utcEndDateTime: new Date(day.getTime() + 86_400_000).toISOString(),
    dateConfidence: 'scheduled',
    dateConfidenceReasoning:
      `${a.vendor.name}'s own deprecation page, announced ${a.announced}, gives the shutdown date as ${readableDate(a.shutdown)}. ` +
      `A shutdown date is the vendor's commitment to developers and is occasionally pushed back, never brought forward.`,
    // The automatic headquarters placement only runs for film, TV, anime and
    // games, so an AI pin has to look its vendor's HQ up itself or it lands
    // nowhere and never shows on the map. Same call, same Wikidata P159.
    address: place?.address ?? null,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    company: a.vendor.name,
    companyWikiUrl: a.vendor.wiki,
    categories: ['AI Models'],
    tags: ['Model retirement', a.vendor.name, 'Deprecation'],
    // No media: a documentation page carries no pictures, and the company's
    // logo on eleven pins would be the padding the quality bar forbids.
    media: [],
    references: [
      {
        url: a.vendor.url,
        title: `${a.vendor.name} deprecations`,
        confidence: 85,
        publishedDate: null,
        startDate: null,
        endDate: null,
        reasoning: `${a.vendor.name}'s full deprecation index, which lists every announcement and the notice period each model gets; this pin's own section is its source.`,
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

async function existingPin(sourceUrl: string): Promise<{ id: number; title: string } | null> {
  const [row] = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "sourceUrl" = $1 LIMIT 1`,
    [sourceUrl],
  );
  return row ?? null;
}

async function run() {
  const today = flags.from || new Date().toISOString().slice(0, 10);
  const all: Announcement[] = [];
  for (const vendor of VENDORS) all.push(...(await fetchAnnouncements(vendor)));
  const upcoming = all
    .filter((a) => a.shutdown >= today)
    .sort((a, b) => a.shutdown.localeCompare(b.shutdown))
    .slice(0, Number(flags.limit));
  console.log(`${all.length} dated announcement(s), ${upcoming.length} with a shutdown still to come from ${today}`);

  const token = flags['dry-run'] ? '' : await login(flags.base!);
  // One lookup per vendor, not one per pin.
  const places = new Map<string, Place>();
  for (const vendor of VENDORS) places.set(vendor.name, await lookupStudioLocation(vendor.wiki));
  for (const [name, place] of places) console.log(`  ${name} HQ: ${place ? `${place.address} (${place.latitude}, ${place.longitude})` : 'not found'}`);

  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  for (const a of upcoming) {
    const body = pinBody(a, places.get(a.vendor.name) ?? null);
    const already = await existingPin(body.sourceUrl);
    if (already && !flags.refresh) {
      console.log(`  = ${a.shutdown} ${already.title} — already pin ${already.id}`);
      skipped++;
      continue;
    }
    console.log(`  ${already ? '~' : '+'} ${a.shutdown} ${body.title}  (${a.items.length} item(s), announced ${a.announced})`);
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
