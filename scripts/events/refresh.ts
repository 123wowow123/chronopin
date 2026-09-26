// Reads who performs at each upcoming event pin and how to get in - ticket
// price, whether it is on sale, the ticket link - off the pin's own pages, and
// stores it (PinEventInfo, 0082) for the pin page and its Event markup.
//
//   npm run events:refresh                         dry run: print what each pin's pages say
//   npm run events:refresh -- --apply              store it in the local database
//   npm run events:refresh -- --ids 2320,3334 --apply
//   npm run events:refresh -- --hours 24 --apply   skip pins read in the last day
//   npm run events:refresh -- --export tasks.json  no credit: the pages and the rules, for a session
//   npm run events:refresh -- --import answers.json --tasks tasks.json --apply
//                                                  store a session's answers to that export
//   CHRONOPIN_TOKEN=... npm run events:refresh -- --apply --push https://www.chronopin.com
//                                                  store through that site's API instead
//
// Which pins: those the site marks as events (isAttendableEvent in
// src/lib/seo.ts) that have not started. Which pages: the pin's source, then
// its two most confident references.
//
// How: the page's own schema.org Event markup first - it is the event's own
// claim, so its price and sale state win. Claude then reads the pages' text
// for what the markup leaves out, and may only use what a page states about
// this event on this date. Without a key (or credit), --export writes the
// pages and the rules for a Claude Code session to answer by hand, and
// --import stores those answers as source 'session'.
//
// READ THE DRY RUN: a tour page lists many shows, and the one read must be
// this pin's night and venue. A row someone set by hand is never overwritten.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type Anthropic from '@anthropic-ai/sdk';
import * as db from '@/server/db';
import { describeError, getClient, MODEL } from '@/server/extract';
import { eventInfoProblem, saveEventInfo } from '@/server/model/pinEventInfo';
import { IN_PAGE_META, type PageMetadata } from '@/server/scrape/inPage';
import { AVAILABILITIES, EMPTY_EVENT_INFO, eventInfoFromMarkup, findEventNode, hasEventInfo, type EventInfoFields, type EventInfoSource } from '@/lib/eventInfo';
import { isAttendableEvent } from '@/lib/seo';
import type { PinJson } from '@/lib/types';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    hours: { type: 'string', default: '0' },
    limit: { type: 'string', default: '500' },
    pause: { type: 'string', default: '1500' },
    export: { type: 'string' },
    import: { type: 'string' },
    push: { type: 'string' },
    tasks: { type: 'string' },
  },
});

const MAX_PAGE_CHARS = 12_000;
const TICKET_WORDS = /ticket|register|registration|buy|book|pass|admission|entry|rsvp|on ?sale|seat/i;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type EventPin = {
  id: number;
  title: string;
  utcStartDateTime: string;
  utcEndDateTime: string | null;
  allDay: boolean;
  address: string | null;
  sourceUrl: string | null;
  references: string[];
};

type PageRead = { url: string; text: string; ticketLinks: { text: string; href: string }[]; markup: EventInfoFields | null };

const EVENT_INFO_PROMPT = `You read web pages about one event - a concert, a match, a conference, a festival - and report who performs and how to get in, exactly as the pages state it.

The event is given by its title, its date and its venue. Pages often cover more than one event (a tour lists every night; a league page lists every match): use only what they say about THIS event, on this date at this venue. If you cannot tell which part is about this event, leave the fields empty.

- performers: who is billed to perform - the headline act and billed support, the two teams (or the named competitors) of a match, the keynote speakers a conference names. Never the organizer, promoter, ticket seller, sponsor or venue. type "PerformingGroup" for a band, a team, an orchestra or a group; "Person" for one person. url: that performer's own page if the pages link it, else "". Empty when the pages name nobody.
- lowPrice / highPrice / priceCurrency: the cheapest and dearest ticket or pass price the pages quote for this event, with its ISO 4217 code ("USD"). One price: both the same. A free event: 0 and 0 with the local currency. Null when no price is quoted. Never a resale price, a past year's price, or a price you know from elsewhere.
- availability: "InStock" when the pages say tickets or registration are on sale now (or entry is free and open); "SoldOut" when they say sold out; "PreOrder" when they say tickets are not on sale yet (coming soon, presale sign-up, waitlist, "on sale <date>"). "" when the pages do not say.
- onSaleDate: for PreOrder, the date and time sales open as ISO 8601 ("2027-01-10T10:00:00-08:00"), else "".
- ticketUrl: the link for buying tickets or registering, copied exactly from the links listed with the page, else "".
- sourceUrl: the page the answer mostly came from.

The page's own schema.org markup, when it has any, is given as "markup": trust it, and fill only what it leaves out.`;

const SCHEMA = {
  type: 'object',
  properties: {
    performers: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, type: { type: 'string', enum: ['Person', 'PerformingGroup'] }, url: { type: 'string' } },
        required: ['name', 'type', 'url'],
        additionalProperties: false,
      },
    },
    lowPrice: { type: ['number', 'null'] },
    highPrice: { type: ['number', 'null'] },
    priceCurrency: { type: 'string' },
    availability: { type: 'string', enum: ['', ...AVAILABILITIES] },
    onSaleDate: { type: 'string' },
    ticketUrl: { type: 'string' },
    sourceUrl: { type: 'string' },
  },
  required: ['performers', 'lowPrice', 'highPrice', 'priceCurrency', 'availability', 'onSaleDate', 'ticketUrl', 'sourceUrl'],
  additionalProperties: false,
};

// The upcoming pins the site marks as events, with their best links.
async function eventPins(): Promise<EventPin[]> {
  const ids = flags.ids?.split(',').map((id) => Number(id.trim())).filter(Boolean);
  const rows = await db.query<
    Omit<EventPin, 'utcStartDateTime' | 'utcEndDateTime' | 'references'> & {
      utcStartDateTime: Date;
      utcEndDateTime: Date | null;
      hasLocation: boolean;
      categories: string[];
      references: string[] | null;
      checkedAt: Date | null;
    }
  >(
    `SELECT "p"."id", "p"."title", "p"."utcStartDateTime", "p"."utcEndDateTime", "p"."allDay", "p"."address", "p"."sourceUrl",
            "p"."location" IS NOT NULL AS "hasLocation",
            COALESCE((SELECT array_agg("t"."name"::text) FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category'), '{}') AS "categories",
            (SELECT array_agg("r"."url" ORDER BY "r"."confidence" DESC, "r"."id") FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "references",
            "e"."checkedAt"
     FROM "Pin" AS "p"
     LEFT JOIN "PinEventInfo" AS "e" ON "e"."pinId" = "p"."id"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND ($1::int[] IS NOT NULL AND "p"."id" = ANY($1::int[])
            OR $1::int[] IS NULL AND COALESCE("p"."utcEndDateTime", "p"."utcStartDateTime") > now()
               AND ("e"."checkedAt" IS NULL OR "e"."checkedAt" < now() - make_interval(hours => $2)))
     ORDER BY "p"."utcStartDateTime"`,
    [ids?.length ? ids : null, Number(flags.hours)],
  );
  return rows
    .filter((row) =>
      isAttendableEvent({ ...row, latitude: row.hasLocation ? 0 : undefined, longitude: row.hasLocation ? 0 : undefined } as unknown as PinJson),
    )
    .slice(0, Number(flags.limit))
    .map((row) => ({
      id: row.id,
      title: row.title,
      utcStartDateTime: new Date(row.utcStartDateTime).toISOString(),
      utcEndDateTime: row.utcEndDateTime ? new Date(row.utcEndDateTime).toISOString() : null,
      allDay: row.allDay,
      address: row.address,
      sourceUrl: row.sourceUrl,
      references: (row.references ?? []).filter((url) => url !== row.sourceUrl).slice(0, 2),
    }));
}

type Browser = Awaited<ReturnType<typeof import('@/server/scrape').launchBrowser>>;

// One page as the browser sees it: its text, the links that look like tickets,
// and what its own Event markup says about this pin's event.
async function readPage(browser: Browser, url: string, pin: EventPin): Promise<PageRead | null> {
  const page = await browser.newPage();
  try {
    page.setDefaultNavigationTimeout(20_000);
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
    } catch (err) {
      if ((err as Error).name !== 'TimeoutError') throw err;
    }
    const text = String((await page.evaluate('document.body ? document.body.innerText : ""').catch(() => '')) || '');
    const meta = (await page.evaluate(IN_PAGE_META).catch(() => null)) as PageMetadata | null;
    const links = (await page
      .evaluate(`[...document.querySelectorAll('a[href]')].map((a) => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 80), href: a.href }))`)
      .catch(() => [])) as { text: string; href: string }[];
    const ticketLinks = links
      .filter((l) => /^https?:/.test(l.href) && (TICKET_WORDS.test(l.text) || TICKET_WORDS.test(l.href)))
      .filter((l, i, all) => all.findIndex((o) => o.href === l.href) === i)
      .slice(0, 25);
    const event = findEventNode(meta?.jsonLd, pin);
    const markup = event ? eventInfoFromMarkup(event) : null;
    return { url, text: text.replace(/\n{3,}/g, '\n\n').slice(0, MAX_PAGE_CHARS), ticketLinks, markup: hasEventInfo(markup) ? markup : null };
  } catch (err) {
    console.log(`    could not read ${url}: ${(err as Error).message}`);
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

function describeEvent(pin: EventPin) {
  return {
    title: pin.title,
    start: pin.allDay ? pin.utcStartDateTime.slice(0, 10) : pin.utcStartDateTime,
    end: pin.utcEndDateTime ? (pin.allDay ? `${pin.utcEndDateTime.slice(0, 10)} (exclusive)` : pin.utcEndDateTime) : null,
    venue: pin.address,
  };
}

// The pages as the model (or a session) is shown them.
const pagesForReading = (pages: PageRead[]) =>
  pages.map((p) => ({ url: p.url, markup: p.markup ?? undefined, ticketLinks: p.ticketLinks, text: p.text }));

// Claude's reading of the pages, or null when there is no key, no credit, or
// the call failed.
async function readWithClaude(anthropic: Anthropic, pin: EventPin, pages: PageRead[]): Promise<Record<string, unknown> | null> {
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: EVENT_INFO_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify({ event: describeEvent(pin), pages: pagesForReading(pages) }, null, 2) }],
    });
    if (response.stop_reason === 'refusal') return null;
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    return block ? (JSON.parse(block.text) as Record<string, unknown>) : null;
  } catch (err) {
    console.log(`    Claude could not read it: ${describeError(err)}`);
    return null;
  }
}

// A model's or session's answer as stored fields: a ticket link must be one
// the pages actually carry, and the markup's own claims win.
function combine(
  answer: Record<string, unknown> | null,
  pages: PageRead[],
  answeredBy: EventInfoSource = 'claude',
): { fields: EventInfoFields; source: EventInfoSource; sourceUrl: string | null } | string {
  const markupPage = pages.find((p) => p.markup);
  const markup = markupPage?.markup ?? EMPTY_EVENT_INFO;
  const links = new Set(pages.flatMap((p) => p.ticketLinks.map((l) => l.href)));
  // A price with no currency says too little to keep; the rest can stand.
  const tidy = answer && answer.lowPrice != null && !answer.priceCurrency ? { ...answer, lowPrice: null, highPrice: null } : answer;
  const checked = tidy ? eventInfoProblem({ ...tidy, source: answeredBy }) : null;
  if (typeof checked === 'string') return checked;
  const read = checked?.fields ?? EMPTY_EVENT_INFO;
  // A reader's pick among the page's own links beats the markup's: markup
  // sometimes links a suite or hospitality booking rather than the tickets.
  const ticketUrl = (read.ticketUrl && links.has(read.ticketUrl) ? read.ticketUrl : null) ?? markup.ticketUrl;
  const priced = markup.lowPrice != null ? markup : read;
  const fields: EventInfoFields = {
    performers: markup.performers.length ? markup.performers : read.performers,
    ticketUrl,
    lowPrice: priced.lowPrice,
    highPrice: priced.highPrice,
    priceCurrency: priced.priceCurrency,
    availability: markup.availability ?? read.availability,
    onSaleDate: markup.availability ? markup.onSaleDate : read.onSaleDate,
  };
  const fromMarkupOnly = !!markupPage && !hasEventInfo(read);
  return {
    fields,
    source: fromMarkupOnly || !answer ? 'markup' : answeredBy,
    sourceUrl: (fromMarkupOnly ? markupPage?.url : checked?.sourceUrl) ?? markupPage?.url ?? pages[0]?.url ?? null,
  };
}

function describe(fields: EventInfoFields): string {
  const parts = [
    fields.performers.length ? `performers: ${fields.performers.map((p) => `${p.name} (${p.type === 'Person' ? 'person' : 'group'})`).join(', ')}` : 'no performers',
    fields.lowPrice != null ? `price ${fields.lowPrice}${fields.highPrice !== fields.lowPrice ? `-${fields.highPrice}` : ''} ${fields.priceCurrency}` : 'no price',
    fields.availability ?? 'sale state unknown',
    fields.onSaleDate ? `on sale ${fields.onSaleDate}` : null,
    fields.ticketUrl ? `tickets ${fields.ticketUrl}` : null,
  ];
  return parts.filter(Boolean).join(' | ');
}

// Stores a reading here, or through --push's API.
async function store(pinId: number, reading: { fields: EventInfoFields; source: EventInfoSource; sourceUrl: string | null }): Promise<string> {
  if (flags.push) {
    const token = process.env.CHRONOPIN_TOKEN;
    if (!token) throw new Error('--push needs CHRONOPIN_TOKEN (an admin token for that site)');
    const response = await fetch(`${flags.push.replace(/\/$/, '')}/api/pins/${pinId}/event-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...reading.fields, source: reading.source, sourceUrl: reading.sourceUrl }),
    });
    return response.ok ? 'stored' : `NOT STORED (${response.status} ${(await response.text()).slice(0, 200)})`;
  }
  return (await saveEventInfo(pinId, reading.fields, { source: reading.source, sourceUrl: reading.sourceUrl })) ? 'stored' : 'NOT STORED (set by hand)';
}

// --import: a session's answers to an --export, [{ pinId, performers, ... }],
// held to the same rules as Claude's: read against the exported pages (--tasks)
// so the markup's claims win and a ticket link must be one the pages carry.
async function importAnswers(file: string) {
  if (!flags.tasks) throw new Error('--import needs --tasks <the --export file it answers>');
  const answers = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
  const { tasks } = JSON.parse(readFileSync(flags.tasks, 'utf8')) as { tasks: { pinId: number; pages: PageRead[] }[] };
  const tally = { stored: 0, empty: 0, failed: 0 };
  for (const answer of answers) {
    const pinId = Number(answer.pinId);
    const task = tasks.find((t) => t.pinId === pinId);
    if (!task) {
      console.log(`#${pinId}: not in ${flags.tasks}`);
      tally.failed++;
      continue;
    }
    const pages = task.pages.map((p) => ({ ...p, markup: p.markup ?? null }));
    const reading = combine(answer, pages, 'session');
    if (typeof reading === 'string') {
      console.log(`#${pinId}: rejected: ${reading}`);
      tally.failed++;
      continue;
    }
    const links = new Set(pages.flatMap((p) => [...p.ticketLinks.map((l) => l.href), p.markup?.ticketUrl]));
    if (answer.ticketUrl && !links.has(String(answer.ticketUrl))) console.log(`#${pinId}: ticket link ${String(answer.ticketUrl)} is not on its pages; dropped`);
    if (!hasEventInfo(reading.fields)) {
      tally.empty++;
      continue;
    }
    console.log(`#${pinId}: ${reading.source}: ${describe(reading.fields)}`);
    if (flags.apply) {
      const result = await store(pinId, reading);
      console.log(`    ${result}`);
      if (result === 'stored') tally.stored++;
      else tally.failed++;
    }
  }
  console.log(`Done: ${tally.stored} stored, ${tally.empty} with nothing stated, ${tally.failed} not stored.`);
}

async function run() {
  if (flags.import) {
    await importAnswers(flags.import);
    return;
  }
  const pins = await eventPins();
  console.log(`${pins.length} upcoming event pin(s) to read${flags.apply ? '' : ' (dry run)'}`);
  const anthropic = flags.export ? null : getClient();
  if (!anthropic && !flags.export) console.log('No Anthropic key: storing what page markup says; use --export for the rest.');

  const { launchBrowser } = await import('@/server/scrape');
  const browser = await launchBrowser();
  const tasks: unknown[] = [];
  const tally = { stored: 0, empty: 0, failed: 0 };
  try {
    for (const pin of pins) {
      console.log(`#${pin.id} ${pin.title} (${pin.utcStartDateTime.slice(0, 10)})`);
      const urls = [pin.sourceUrl, ...pin.references].filter((u): u is string => !!u);
      const pages: PageRead[] = [];
      for (const url of urls) {
        const read = await readPage(browser, url, pin);
        if (read) pages.push(read);
      }
      if (flags.export) {
        tasks.push({ pinId: pin.id, event: describeEvent(pin), pages: pagesForReading(pages) });
        continue;
      }
      const answer = anthropic && pages.some((p) => p.text.length > 200) ? await readWithClaude(anthropic, pin, pages) : null;
      const reading = combine(answer, pages);
      if (typeof reading === 'string') {
        console.log(`    rejected: ${reading}`);
        tally.failed++;
        continue;
      }
      if (!hasEventInfo(reading.fields)) {
        console.log('    nothing stated');
        tally.empty++;
        continue;
      }
      console.log(`    ${reading.source}: ${describe(reading.fields)}`);
      if (flags.apply) {
        const result = await store(pin.id, reading);
        console.log(`    ${result}`);
        if (result === 'stored') tally.stored++;
        else tally.failed++;
      }
      await sleep(Number(flags.pause));
    }
  } finally {
    await browser.close();
  }

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ rules: EVENT_INFO_PROMPT, answerShape: SCHEMA, tasks }, null, 2));
    console.log(`Wrote ${tasks.length} task(s) to ${flags.export}. Answer each as [{ pinId, ...answerShape }] and run --import <answers> --apply.`);
    return;
  }
  console.log(`Done: ${tally.stored} stored, ${tally.empty} with nothing stated, ${tally.failed} not stored.`);
  if (flags.apply && !flags.push) console.log('Persist it with npm run backup:data.');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
