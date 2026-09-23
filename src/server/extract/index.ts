/**
 * One LLM call per scraped page, returning every field the DOM scrapers
 * either get wrong or cannot get at all: the cost, the location, how much
 * to trust the date, and the long-form summary.
 *
 * The DOM price scraper it replaced read the first "$" on the page with a
 * digits-only regex, so "CA$6.4 billion" came back as 6.4 and a comma-
 * formatted "$1,299.00" came back as a string that rendered as "$NaN".
 * Magnitude words and currency prefixes are the whole problem, so they are
 * what the schema below asks for explicitly.
 */

import Anthropic from '@anthropic-ai/sdk';
import config from '../config';
import { CATEGORIES } from '@/lib/categories';
import log from '../util/log';
import { SYSTEM_PROMPT } from './systemPrompt';

export const MODEL = 'claude-opus-5';

// Wikipedia articles run long and the tail is references and navigation.
// The lede plus infobox plus body comfortably fits, and capping keeps a
// pathological page from becoming a six-figure-token request.
export const MAX_PAGE_CHARS = 60000;

// Shared by every prompt that writes a long-form summary: a product's pin
// should say what the thing is, not only when it happens.
export const PRODUCT_FEATURES_RULE = `When the event is about a product - an aircraft, vehicle, device, chip, game, AI model or software release - follow the event's list with a section of its own, "<h3>Notable features</h3><ul><li>...</li></ul>": what the product is and what is new or distinctive over what it replaces or competes with, and its headline specifications (size, capacity, range, performance, price) with their units, cited like every other point. The event's list above it keeps to the event itself (dates, schedule, who is involved).`;

const CONFIDENCE_LEVELS = ['confirmed', 'scheduled', 'estimated', 'delayed', 'unknown'] as const;

export type ExtractedFields = {
  title: string | null;
  description: string | null;
  price: number | null;
  priceCurrency: string | null;
  placeLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  dateConfidence: (typeof CONFIDENCE_LEVELS)[number];
  dateConfidenceReasoning: string | null;
  originalStartDate: string | null;
  delayReasoning: string | null;
  company: string | null;
  companyWikiUrl: string | null;
  categories: string[];
  workTitle: string | null;
  episodeCount: number | null;
  episodeStatus: 'complete' | 'ongoing' | 'planned' | null;
  amazonUrl: string | null;
  bestBuyUrl: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  allDay: boolean;
  allDayStated: boolean;
  longFormSummary: string | null;
  stocks: { symbol: string; name: string; relation: 'company' | 'related' | 'supplier'; note: string }[];
  tags: string[];
};

// Structured output allows at most 16 fields that can be null (the API
// rejects the whole schema past that, which silently turned every extraction
// into a session task), so these rarely-set ones are plain strings, empty when
// the page has nothing for them. emptyAsNull turns that back into null.
const EMPTY_AS_NULL = ['originalStartDate', 'delayReasoning', 'workTitle', 'episodeStatus', 'amazonUrl', 'bestBuyUrl'] as const;

export function emptyAsNull<T extends Partial<ExtractedFields>>(fields: T): T {
  const out = { ...fields } as Record<string, unknown>;
  for (const key of EMPTY_AS_NULL) if (typeof out[key] === 'string' && !(out[key] as string).trim()) out[key] = null;
  return out as T;
}

export const SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: ['string', 'null'],
      description:
        'Event-phrased headline, e.g. "Gordie Howe International Bridge Opens". Not the raw page title and never suffixed with the site name.',
    },
    description: {
      type: ['string', 'null'],
      description: 'One or two plain-text sentences on what this is and why it matters.',
    },
    price: {
      type: ['number', 'null'],
      description:
        'Total headline cost as a plain number, fully expanded: "CA$6.4 billion" is 6400000000, not 6.4. Null when the page states no cost.',
    },
    priceCurrency: {
      type: ['string', 'null'],
      description: 'ISO 4217 code for the price, e.g. "USD", "CAD", "EUR". Null when no cost was found.',
    },
    placeLabel: {
      type: ['string', 'null'],
      description:
        'Human-readable place this is about, e.g. "Detroit, Michigan" or "Jeddah, Saudi Arabia". Null when the page is not about a place.',
    },
    latitude: {
      type: ['number', 'null'],
      description: 'Latitude of placeLabel in decimal degrees, -90 to 90.',
    },
    longitude: {
      type: ['number', 'null'],
      description: 'Longitude of placeLabel in decimal degrees, -180 to 180.',
    },
    dateConfidence: {
      type: 'string',
      enum: CONFIDENCE_LEVELS,
      description:
        'How firmly the page states the date. confirmed: stated as firm. scheduled: given as scheduled. estimated: a target, not a fixed date. delayed: the date has moved. unknown: no wording about the date was found.',
    },
    dateConfidenceReasoning: {
      type: ['string', 'null'],
      description:
        'One sentence naming the wording that decided dateConfidence, quoting the page, e.g. \'Stated as firm, per en.wikipedia.org: "...was completed in June 2026..."\'. Null when dateConfidence is "unknown".',
    },
    originalStartDate: {
      type: 'string',
      description:
        'When the date has moved: the day the event was first promised for, before any delay, as "YYYY-MM-DD" in the same convention as startDateTime (a year alone is its last day, "2027-12-31"; a month its last day). Empty ("") when the date has not moved.',
    },
    delayReasoning: {
      type: 'string',
      description:
        'One sentence on how long the delay is and how you know, quoting the page, e.g. \'Stated: first "slated for 2027", now "projected for 2032".\' or \'Estimated: the page says only that opening "will slip"; comparable metro extensions have slipped about two years.\'. Empty ("") when originalStartDate is null.',
    },
    company: {
      type: ['string', 'null'],
      description:
        'The company or organization this event is principally about or done by, e.g. "Apple", "SpaceX", "City of Detroit". Null when no single organization owns the event.',
    },
    companyWikiUrl: {
      type: ['string', 'null'],
      description:
        'Direct URL to that company\'s own English Wikipedia article, disambiguated from unrelated topics that share its name, e.g. "https://en.wikipedia.org/wiki/Apple_Inc." not "https://en.wikipedia.org/wiki/Apple" (the fruit), "https://en.wikipedia.org/wiki/Tesla,_Inc." not "https://en.wikipedia.org/wiki/Tesla" (the scientist). Null when company is null or has no Wikipedia article.',
    },
    categories: {
      type: 'array',
      items: { type: 'string', enum: CATEGORIES },
      description:
        'The categories this event belongs to from the fixed list, the best fit first. Each name is one word, so take every word the event is squarely about: an anime film is "Anime" and "Movie", its soundtrack release is "Anime" and "Music", a new metro line is "Transport". Never force a pin into a word that only loosely covers it - two or three exact words beat one broad one.',
    },
    workTitle: {
      type: 'string',
      description:
        'When a category is Anime, Movie or TV, or the pin is about one video game: the film\'s, show\'s or game\'s own official English title, with any season or part as it is officially styled, e.g. "Jujutsu Kaisen Season 2", "Frieren: Beyond Journey\'s End" or "Grand Theft Auto VI" - not the event headline. Empty ("") otherwise.',
    },
    episodeCount: {
      type: ['number', 'null'],
      description:
        'For a work released as episodes (TV series, anime, a web or podcast series): how many episodes the run this pin is about has, as a whole number. A pin about one season counts that season, not the whole show. Null for a film, a one-off event, or when the page does not say.',
    },
    episodeStatus: {
      type: 'string',
      description:
        'What episodeCount counts: "complete" when the run has finished airing, "planned" when that is the number announced for a run still to air or still airing, "ongoing" when it is the episodes out so far and no total has been announced. Empty ("") when episodeCount is null.',
    },
    amazonUrl: {
      type: 'string',
      description:
        "Direct URL to this exact product's own listing on amazon.com, from your own knowledge of real Amazon listings - never a guessed or constructed URL. An empty string when the page is not about a specific purchasable consumer product, or you are not confident of the real listing URL.",
    },
    bestBuyUrl: {
      type: 'string',
      description:
        "Direct URL to this exact product's own listing on bestbuy.com, from your own knowledge of real Best Buy listings - never a guessed or constructed URL. An empty string when the page is not about a specific purchasable consumer product, or you are not confident of the real listing URL.",
    },
    startDateTime: {
      type: ['string', 'null'],
      description:
        'ISO 8601 UTC start of the event, e.g. "2026-09-18T16:00:00Z". For an all-day event, midnight UTC of its date, e.g. "2026-09-18T00:00:00Z". Null when no date was found.',
    },
    endDateTime: {
      type: ['string', 'null'],
      description:
        'ISO 8601 UTC end of the event. For an all-day event, midnight UTC of the day after its last day, e.g. "2026-09-21T00:00:00Z" for one ending on Sep 20. Null when the page gives only one date.',
    },
    allDay: {
      type: 'boolean',
      description: 'True when the page gives a date but no clock time.',
    },
    allDayStated: {
      type: 'boolean',
      description:
        'True only when the page itself says the event takes a whole day or runs across days - a festival weekend, a sale window, a funding period, a conference. False when the page simply never gives a clock time for a moment-in-time event such as a signing, a release or a launch. This is a claim about the event, not about what the page left out, so when in doubt it is false.',
    },
    stocks: {
      type: 'array',
      description:
        'US-listed stocks the story is about or would move: the company itself (relation "company"), companies it names as investors, owners, partners or rivals ("related"), and ones it names as suppliers of chips, cloud, parts or content ("supplier"). note is the clause that follows the company\'s name, e.g. "which designs the PlayStation 5 processor". Empty when the page names none.',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'US ticker symbol, e.g. "MSFT".' },
          name: { type: 'string' },
          relation: { type: 'string', enum: ['company', 'related', 'supplier'] },
          note: { type: 'string' },
        },
        required: ['symbol', 'name', 'relation', 'note'],
        additionalProperties: false,
      },
    },
    tags: {
      type: 'array',
      description:
        'Up to 8 short tags a reader would search by: every award, prize or festival the work or subject won or was nominated at, as the body and year ("Tokyo Anime Award Festival 2024", "Crunchyroll Anime Awards 2025", "97th Academy Awards"), then named franchises, series, people, programmes or places central to the story ("Artemis", "Studio Ghibli"). Not the category, company or a word from the title alone.',
      items: { type: 'string' },
    },
    longFormSummary: {
      type: ['string', 'null'],
      description:
        `Key points as an HTML bulleted list, "<ul><li>...</li></ul>" - rendered as HTML on the pin page, so real list markup, not prose and not markdown. ${PRODUCT_FEATURES_RULE} Null when the page has too little to summarize.`,
    },
  },
  required: [
    'stocks',
    'tags',
    'title',
    'description',
    'price',
    'priceCurrency',
    'placeLabel',
    'latitude',
    'longitude',
    'dateConfidence',
    'dateConfidenceReasoning',
    'originalStartDate',
    'delayReasoning',
    'company',
    'companyWikiUrl',
    'categories',
    'workTitle',
    'episodeCount',
    'episodeStatus',
    'amazonUrl',
    'bestBuyUrl',
    'startDateTime',
    'endDateTime',
    'allDay',
    'allDayStated',
    'longFormSummary',
  ],
  additionalProperties: false,
};

// The extraction as a task a Claude Code session can answer when the API is
// unavailable: the same system prompt, schema and user message the call uses.
export function extractTask(pageUrl: string, pageText: string, note?: string) {
  return {
    stage: 'extract' as const,
    system: SYSTEM_PROMPT,
    schema: SCHEMA,
    input: withNote(`Source URL: ${pageUrl}\n\nPage text:\n\n${(pageText || '').trim().slice(0, MAX_PAGE_CHARS)}`, note),
  };
}

// The longest note someone pinning a page may give the AI with it.
export const NOTE_MAX = 2000;

// A request's content with the note of the person pinning the page after it,
// marked as theirs rather than the page's. Unchanged without one.
export function withNote(content: string, note?: string | null): string {
  const text = (note || '').trim().slice(0, NOTE_MAX).replace(/"""/g, '"');
  return text ? `${content}\n\nThe note of the person pinning this (theirs, not the page's):\n"""\n${text}\n"""` : content;
}

let client: Anthropic | null = null;

export function getClient(): Anthropic | null {
  const apiKey = config.anthropic.apiKey;
  if (!apiKey || apiKey === 'REPLACE_WITH_ANTHROPIC_API_KEY') {
    return null;
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'anthropic auth rejected - check ANTHROPIC_API_KEY';
  if (err instanceof Anthropic.RateLimitError) return 'anthropic rate limited';
  if (err instanceof Anthropic.BadRequestError) return `anthropic rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return `could not reach anthropic: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `anthropic error ${err.status}: ${err.message}`;
  return (err as Error)?.message || String(err);
}

/**
 * Resolves to the extracted fields, or to null when there is no API key, the
 * page had no usable text, or the call failed. Callers keep whatever the DOM
 * scrapers found in that case - a missing key must not break scraping.
 */
export async function extractPinFields(pageUrl: string, pageText: string, note?: string): Promise<ExtractedFields | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const text = (pageText || '').trim();
  if (text.length < 200) return null;

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // A policy decline on Opus 5 is retried server-side on a fallback
      // model inside the same call, instead of losing the extraction.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: withNote(`Source URL: ${pageUrl}\n\nPage text:\n\n${text.slice(0, MAX_PAGE_CHARS)}`, note),
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      log.warn('extract refused', log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
    return block ? emptyAsNull(JSON.parse(block.text) as ExtractedFields) : null;
  } catch (err) {
    log.warn('extract failed', describeError(err));
    return null;
  }
}

/**
 * The place a pin is about, split into the fields Pin stores: address is the
 * label, latitude/longitude become Pin.location. Coordinates that are missing
 * or out of range are dropped - the pin just gets no map - but the label is
 * still worth keeping on its own.
 */
export function toLocation(fields: Partial<ExtractedFields> | null) {
  if (!fields || !fields.placeLabel) return undefined;
  const { latitude: lat, longitude: lng } = fields;
  const plausible =
    Number.isFinite(lat) && Number.isFinite(lng) && lat! >= -90 && lat! <= 90 && lng! >= -180 && lng! <= 180;
  return {
    address: fields.placeLabel,
    latitude: plausible ? lat! : undefined,
    longitude: plausible ? lng! : undefined,
  };
}
