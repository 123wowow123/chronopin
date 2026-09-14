/**
 * One LLM call per scraped page, returning every field the DOM scrapers
 * either get wrong or cannot get at all: the cost, the location, how much
 * to trust the date, and the long-form summary.
 *
 * The DOM price scraper it replaces reads the first "$" on the page with a
 * digits-only regex, so "CA$6.4 billion" came back as 6.4 and a comma-
 * formatted "$1,299.00" came back as a string that rendered as "$NaN".
 * Magnitude words and currency prefixes are the whole problem, so they are
 * what the schema below asks for explicitly.
 */

'use strict';

import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { FormData } from 'formdata-node';
import config from '../config/environment';
import * as log from '../util/log';

const MODEL = 'claude-opus-5';

// The SDK is built against the WHATWG fetch globals, which Node 16 does not
// have. Passing it a `fetch` alone is not enough: it reaches for Headers and
// Response internally, and buildBody does an `instanceof FormData` check on
// every request, JSON bodies included. Guarded so all of this becomes a
// no-op the moment the project moves to Node 18+.
function installFetchGlobals() {
  if (typeof globalThis.fetch === 'undefined') globalThis.fetch = fetch;
  if (typeof globalThis.Headers === 'undefined') globalThis.Headers = fetch.Headers;
  if (typeof globalThis.Request === 'undefined') globalThis.Request = fetch.Request;
  if (typeof globalThis.Response === 'undefined') globalThis.Response = fetch.Response;
  if (typeof globalThis.FormData === 'undefined') globalThis.FormData = FormData;
}

// Wikipedia articles run long and the tail is references and navigation.
// The lede plus infobox plus body comfortably fits, and capping keeps a
// pathological page from becoming a six-figure-token request.
const MAX_PAGE_CHARS = 60000;

const CONFIDENCE_LEVELS = ['confirmed', 'scheduled', 'estimated', 'delayed', 'unknown'];

const CATEGORIES = [
  'Consumer Electronics',
  'Software',
  'Computing & Semiconductors',
  'Gaming & Entertainment',
  'Space & Astronomy',
  'Infrastructure & Transportation',
  'Architecture & Real Estate',
  'Automotive',
  'Energy',
  'Corporate & Finance',
  'Policy & Legal',
  'Other'
];

const SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: ['string', 'null'],
      description: 'Event-phrased headline, e.g. "Gordie Howe International Bridge Opens". Not the raw page title and never suffixed with the site name.'
    },
    description: {
      type: ['string', 'null'],
      description: 'One or two plain-text sentences on what this is and why it matters.'
    },
    price: {
      type: ['number', 'null'],
      description: 'Total headline cost as a plain number, fully expanded: "CA$6.4 billion" is 6400000000, not 6.4. Null when the page states no cost.'
    },
    priceCurrency: {
      type: ['string', 'null'],
      description: 'ISO 4217 code for the price, e.g. "USD", "CAD", "EUR". Null when no cost was found.'
    },
    placeLabel: {
      type: ['string', 'null'],
      description: 'Human-readable place this is about, e.g. "Detroit, Michigan" or "Jeddah, Saudi Arabia". Null when the page is not about a place.'
    },
    latitude: {
      type: ['number', 'null'],
      description: 'Latitude of placeLabel in decimal degrees, -90 to 90.'
    },
    longitude: {
      type: ['number', 'null'],
      description: 'Longitude of placeLabel in decimal degrees, -180 to 180.'
    },
    dateConfidence: {
      type: 'string',
      enum: CONFIDENCE_LEVELS,
      description: 'How firmly the page states the date. confirmed: stated as firm. scheduled: given as scheduled. estimated: a target, not a fixed date. delayed: the date has moved. unknown: no wording about the date was found.'
    },
    dateConfidenceReasoning: {
      type: ['string', 'null'],
      description: 'One sentence naming the wording that decided dateConfidence, quoting the page, e.g. \'Stated as firm, per en.wikipedia.org: "...was completed in June 2026..."\'. Null when dateConfidence is "unknown".'
    },
    company: {
      type: ['string', 'null'],
      description: 'The company or organization this event is principally about or done by, e.g. "Apple", "SpaceX", "City of Detroit". Null when no single organization owns the event.'
    },
    companyWikiUrl: {
      type: ['string', 'null'],
      description: 'Direct URL to that company\'s own English Wikipedia article, disambiguated from unrelated topics that share its name, e.g. "https://en.wikipedia.org/wiki/Apple_Inc." not "https://en.wikipedia.org/wiki/Apple" (the fruit), "https://en.wikipedia.org/wiki/Tesla,_Inc." not "https://en.wikipedia.org/wiki/Tesla" (the scientist). Null when company is null or has no Wikipedia article.'
    },
    category: {
      type: 'string',
      enum: CATEGORIES,
      description: 'Best-fit category for this event from the fixed list. Use "Other" only when nothing else reasonably fits.'
    },
    amazonUrl: {
      type: ['string', 'null'],
      description: 'Direct URL to this exact product\'s own listing on amazon.com, from your own knowledge of real Amazon listings - never a guessed or constructed URL. Null when the page is not about a specific purchasable consumer product, or you are not confident of the real listing URL.'
    },
    bestBuyUrl: {
      type: ['string', 'null'],
      description: 'Direct URL to this exact product\'s own listing on bestbuy.com, from your own knowledge of real Best Buy listings - never a guessed or constructed URL. Null when the page is not about a specific purchasable consumer product, or you are not confident of the real listing URL.'
    },
    startDateTime: {
      type: ['string', 'null'],
      description: 'ISO 8601 UTC start of the event, e.g. "2026-09-18T12:00:00Z". Use noon UTC for all-day events. Null when no date was found.'
    },
    endDateTime: {
      type: ['string', 'null'],
      description: 'ISO 8601 UTC end of the event. Null when the page gives only one date.'
    },
    allDay: {
      type: 'boolean',
      description: 'True when the page gives a date but no clock time.'
    },
    longFormSummary: {
      type: ['string', 'null'],
      description: 'Key points as an HTML bulleted list, "<ul><li>...</li></ul>" - rendered with ng-bind-html, so real list markup, not prose and not markdown. Null when the page has too little to summarize.'
    }
  },
  required: [
    'title',
    'description',
    'price',
    'priceCurrency',
    'placeLabel',
    'latitude',
    'longitude',
    'dateConfidence',
    'dateConfidenceReasoning',
    'company',
    'companyWikiUrl',
    'category',
    'amazonUrl',
    'bestBuyUrl',
    'startDateTime',
    'endDateTime',
    'allDay',
    'longFormSummary'
  ],
  additionalProperties: false
};

// Read once at load, the way web.js reads scrape.min.js. Kept as text so the
// prompt can be tuned without touching code - grunt's dist copy takes all of
// server/**/*, so it ships with the build.
const SYSTEM_PROMPT = fs.readFileSync(__dirname + '/system-prompt.txt', 'utf8').trim();

let client = null;

function getClient() {
  const apiKey = config.anthropic && config.anthropic.apiKey;
  if (!apiKey || apiKey === 'REPLACE_WITH_ANTHROPIC_API_KEY') return null;
  if (!client) {
    installFetchGlobals();
    const Ctor = Anthropic.default || Anthropic;
    client = new Ctor({ apiKey, fetch });
  }
  return client;
}

function describeError(err) {
  const A = Anthropic.default || Anthropic;
  if (err instanceof A.AuthenticationError) return 'anthropic auth rejected - check config.anthropic.apiKey';
  if (err instanceof A.RateLimitError) return 'anthropic rate limited';
  if (err instanceof A.BadRequestError) return `anthropic rejected the request: ${err.message}`;
  if (err instanceof A.APIConnectionError) return `could not reach anthropic: ${err.message}`;
  if (err instanceof A.APIError) return `anthropic error ${err.status}: ${err.message}`;
  return err && err.message || String(err);
}

/**
 * Resolves to the extracted fields, or to null when there is no API key, the
 * page had no usable text, or the call failed. Callers keep whatever the DOM
 * scrapers found in that case - a missing key must not break scraping.
 */
export function extractPinFields(pageUrl, pageText) {
  const anthropic = getClient();
  if (!anthropic) return Promise.resolve(null);

  const text = (pageText || '').trim();
  if (text.length < 200) return Promise.resolve(null);

  return anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: 'json_schema', schema: SCHEMA }
    },
    messages: [{
      role: 'user',
      content: `Source URL: ${pageUrl}\n\nPage text:\n\n${text.slice(0, MAX_PAGE_CHARS)}`
    }]
  })
    .then(response => {
      if (response.stop_reason === 'refusal') {
        log.warn('extract refused', log.stringify(response.stop_details));
        return null;
      }
      const block = response.content.find(b => b.type === 'text');
      if (!block) return null;
      return JSON.parse(block.text);
    })
    .catch(err => {
      log.warn('extract failed', describeError(err));
      return null;
    });
}

/**
 * The place a pin is about, split into the fields Pin stores: address is the
 * label, latitude/longitude become Pin.location. Coordinates that are missing
 * or out of range are dropped - the pin just gets no map - but the label is
 * still worth keeping on its own.
 */
export function toLocation(fields) {
  if (!fields || !fields.placeLabel) return undefined;
  const { latitude: lat, longitude: lng } = fields;
  const plausible = Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  return {
    address: fields.placeLabel,
    latitude: plausible ? lat : undefined,
    longitude: plausible ? lng : undefined
  };
}
