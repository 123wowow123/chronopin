// Reading who performs at an event pin and how to get in off the pin's own
// pages (PinEventInfo, 0082). Shared by `npm run events:refresh` and the daily
// jobs' eventInfo task (src/server/jobs/tools.ts), so both hold a reading to
// the same rules:
//
// - the page's own schema.org Event markup comes first, and only the Event on
//   the pin's date counts (a tour page lists every night; a festival's site
//   often still describes last year's edition);
// - a reader (Claude, or a Claude Code session) fills the rest from the pages'
//   text, using only what they state about this event on this date;
// - a ticket link must be one the pages carry, never constructed.

import type Anthropic from '@anthropic-ai/sdk';
import * as db from './db';
import { describeError, MODEL } from './extract';
import { eventInfoProblem } from './model/pinEventInfo';
import { IN_PAGE_META, type PageMetadata } from './scrape/inPage';
import { AVAILABILITIES, EMPTY_EVENT_INFO, eventInfoFromMarkup, findEventNode, hasEventInfo, type EventInfoFields, type EventInfoSource } from '@/lib/eventInfo';
import { isAttendableEvent } from '@/lib/seo';
import type { PinJson } from '@/lib/types';

export type EventPin = {
  id: number;
  title: string;
  utcStartDateTime: string;
  utcEndDateTime: string | null;
  allDay: boolean;
  address: string | null;
  sourceUrl: string | null;
  // Its two most confident references other than the source.
  references: string[];
};

export type PageRead = { url: string; text: string; ticketLinks: { text: string; href: string }[]; markup: EventInfoFields | null };

export type EventReading = { fields: EventInfoFields; source: EventInfoSource; sourceUrl: string | null };

const TICKET_WORDS = /ticket|register|registration|buy|book|pass|admission|entry|rsvp|on ?sale|seat/i;

export const EVENT_INFO_PROMPT = `You read web pages about one event - a concert, a match, a conference, a festival - and report who performs and how to get in, exactly as the pages state it.

The event is given by its title, its date and its venue. Pages often cover more than one event (a tour lists every night; a league page lists every match): use only what they say about THIS event, on this date at this venue. If you cannot tell which part is about this event, leave the fields empty.

- performers: who is billed to perform - the headline act and billed support, the two teams (or the named competitors) of a match, the keynote speakers a conference names. Never the organizer, promoter, ticket seller, sponsor or venue. type "PerformingGroup" for a band, a team, an orchestra or a group; "Person" for one person. url: that performer's own page if the pages link it, else "". Empty when the pages name nobody.
- lowPrice / highPrice / priceCurrency: the cheapest and dearest ticket or pass price the pages quote for this event, with its ISO 4217 code ("USD"). One price: both the same. A free event: 0 and 0 with the local currency. Null when no price is quoted. Never a resale price, a past year's price, or a price you know from elsewhere.
- availability: "InStock" when the pages say tickets or registration are on sale now (or entry is free and open); "SoldOut" when they say sold out; "PreOrder" when they say tickets are not on sale yet (coming soon, presale sign-up, waitlist, "on sale <date>"). "" when the pages do not say.
- onSaleDate: for PreOrder, the date and time sales open as ISO 8601 ("2027-01-10T10:00:00-08:00"), else "".
- ticketUrl: the link for buying tickets or registering, copied exactly from the links listed with the page, else "".
- sourceUrl: the page the answer mostly came from.

The page's own schema.org markup, when it has any, is given as "markup": trust it, and fill only what it leaves out.`;

export const EVENT_INFO_SCHEMA = {
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

// The upcoming pins the site marks as events (isAttendableEvent), with their
// best links: the named ids, or those never read or read more than `hours`
// ago, soonest first.
export async function eventPins({ ids, hours = 0, limit = 500 }: { ids?: number[]; hours?: number; limit?: number } = {}): Promise<EventPin[]> {
  const rows = await db.query<
    Omit<EventPin, 'utcStartDateTime' | 'utcEndDateTime' | 'references'> & {
      utcStartDateTime: Date;
      utcEndDateTime: Date | null;
      hasLocation: boolean;
      categories: string[];
      references: string[] | null;
    }
  >(
    `SELECT "p"."id", "p"."title", "p"."utcStartDateTime", "p"."utcEndDateTime", "p"."allDay", "p"."address", "p"."sourceUrl",
            "p"."location" IS NOT NULL AS "hasLocation",
            COALESCE((SELECT array_agg("t"."name"::text) FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category'), '{}') AS "categories",
            (SELECT array_agg("r"."url" ORDER BY "r"."confidence" DESC, "r"."id") FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "references"
     FROM "Pin" AS "p"
     LEFT JOIN "PinEventInfo" AS "e" ON "e"."pinId" = "p"."id"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND ($1::int[] IS NOT NULL AND "p"."id" = ANY($1::int[])
            OR $1::int[] IS NULL AND COALESCE("p"."utcEndDateTime", "p"."utcStartDateTime") > now()
               AND ("e"."checkedAt" IS NULL OR "e"."checkedAt" < now() - make_interval(hours => $2)))
     ORDER BY "e"."checkedAt" NULLS FIRST, "p"."utcStartDateTime"`,
    [ids?.length ? ids : null, hours],
  );
  return rows
    .filter((row) =>
      isAttendableEvent({ ...row, latitude: row.hasLocation ? 0 : undefined, longitude: row.hasLocation ? 0 : undefined } as unknown as PinJson),
    )
    .slice(0, limit)
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

type Browser = Awaited<ReturnType<typeof import('./scrape').launchBrowser>>;

// One page as the browser sees it: its text (cut to maxChars), the links that
// look like tickets, and what its own Event markup says about this pin's event.
export async function readPage(browser: Browser, url: string, pin: EventPin, maxChars = 12_000): Promise<PageRead | null> {
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
    return { url, text: text.replace(/\n{3,}/g, '\n\n').slice(0, maxChars), ticketLinks, markup: hasEventInfo(markup) ? markup : null };
  } catch (err) {
    console.log(`    could not read ${url}: ${(err as Error).message}`);
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

// The pin's source and its two best references, as read.
export async function readEventPages(browser: Browser, pin: EventPin, maxChars?: number): Promise<PageRead[]> {
  const pages: PageRead[] = [];
  for (const url of [pin.sourceUrl, ...pin.references].filter((u): u is string => !!u)) {
    const read = await readPage(browser, url, pin, maxChars);
    if (read) pages.push(read);
  }
  return pages;
}

export function describeEvent(pin: EventPin) {
  return {
    title: pin.title,
    start: pin.allDay ? pin.utcStartDateTime.slice(0, 10) : pin.utcStartDateTime,
    end: pin.utcEndDateTime ? (pin.allDay ? `${pin.utcEndDateTime.slice(0, 10)} (exclusive)` : pin.utcEndDateTime) : null,
    venue: pin.address,
  };
}

// The pages as a reader is shown them.
export const pagesForReading = (pages: PageRead[]) =>
  pages.map((p) => ({ url: p.url, markup: p.markup ?? undefined, ticketLinks: p.ticketLinks, text: p.text }));

// Claude's reading of the pages, or null when the call failed or was declined.
export async function readWithClaude(anthropic: Anthropic, pin: EventPin, pages: PageRead[]): Promise<Record<string, unknown> | null> {
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: EVENT_INFO_SCHEMA } },
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

// A reader's answer as stored fields, or a sentence saying why it cannot be
// stored. The markup's own claims win, except its ticket link: a reader's
// pick among the page's links beats it, since markup sometimes links a suite
// or hospitality booking rather than the tickets. A ticket link the pages do
// not carry is dropped.
export function combineReading(answer: Record<string, unknown> | null, pages: PageRead[], answeredBy: EventInfoSource = 'claude'): EventReading | string {
  const markupPage = pages.find((p) => p.markup);
  const markup = markupPage?.markup ?? EMPTY_EVENT_INFO;
  const links = new Set(pages.flatMap((p) => p.ticketLinks.map((l) => l.href)));
  // A price with no currency says too little to keep; the rest can stand.
  const tidy = answer && answer.lowPrice != null && !answer.priceCurrency ? { ...answer, lowPrice: null, highPrice: null } : answer;
  const checked = tidy ? eventInfoProblem({ ...tidy, source: answeredBy }) : null;
  if (typeof checked === 'string') return checked;
  const read = checked?.fields ?? EMPTY_EVENT_INFO;
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

// One line about a reading, for logs.
export function describeReading(fields: EventInfoFields): string {
  const parts = [
    fields.performers.length ? `performers: ${fields.performers.map((p) => `${p.name} (${p.type === 'Person' ? 'person' : 'group'})`).join(', ')}` : 'no performers',
    fields.lowPrice != null ? `price ${fields.lowPrice}${fields.highPrice !== fields.lowPrice ? `-${fields.highPrice}` : ''} ${fields.priceCurrency}` : 'no price',
    fields.availability ?? 'sale state unknown',
    fields.onSaleDate ? `on sale ${fields.onSaleDate}` : null,
    fields.ticketUrl ? `tickets ${fields.ticketUrl}` : null,
  ];
  return parts.filter(Boolean).join(' | ');
}
