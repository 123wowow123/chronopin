import getVideoId from 'get-video-id';
import _ from 'lodash';
import config from '../config';
import { extractPinFields, toLocation, type ExtractedFields } from '../extract';
import { findReferences, type FoundReferences } from '../extract/references';
import Medium from '../model/medium';
import Merchant from '../model/merchant';
import Pin from '../model/pin';
import PinReference from '../model/pinReference';
import { fetchJson } from '../util/fetchJson';
import { IN_PAGE_SCRAPE, type InPageResult } from './inPage';

const { scrapeType, mediumID } = config;
const NAVIGATION_WAIT_MS = 8000;

// Builds a draft pin from a URL: a tweet or YouTube video becomes a pin around
// that embed; any other page is loaded in headless Chrome for its images and
// embeds, then read by the LLM extractor for everything else.
export async function scrape(pageUrl: string) {
  const domain = pageUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/?\n]+)/)?.[1];
  let type: string;
  let pin: Pin;
  switch (domain) {
    case 'twitter.com':
    case 'x.com':
      type = scrapeType.twitter;
      pin = await twitterPost(pageUrl);
      break;
    case 'youtu.be':
    case 'youtube.com':
      type = scrapeType.youtube;
      pin = await youtubePost(pageUrl);
      break;
    default:
      type = scrapeType.web;
      pin = await webScrape(pageUrl);
      break;
  }
  return Object.assign({}, pin.toJSON(), { type });
}

// The references found for a pin, and the summary they ground, when one was
// written - it is preferred to a summary of the source alone.
function addReferences(pin: Pin, { references, longFormSummary }: FoundReferences): Pin {
  references.forEach((r) => pin.addReference(new PinReference(r)));
  if (longFormSummary) pin.longFormSummary = longFormSummary;
  return pin;
}

/* Twitter */

async function twitterPost(pageUrl: string) {
  const { res, medium } = await twitterMedium(pageUrl);
  const pin = new Pin().addMedium(medium);
  return addReferences(pin, await findReferences(pageUrl, tweetText(res.html), 'tweet'));
}

// The tweet as plain text, its links written out so they can be followed.
export function tweetText(html: string | undefined) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function twitterMedium(pageUrl: string) {
  const twitterId = pageUrl.match(/\/(\d+)$/)?.[1] || pageUrl.match(/^(\d+)$/)?.[1];
  if (!twitterId) {
    throw new Error(`No tweet id in ${pageUrl}`);
  }
  const res = await fetchJson(`https://publish.twitter.com/oembed?url=https://twitter.com/Interior/status/${twitterId}`);
  const medium = new Medium({
    type: mediumID.twitter,
    html: res.html,
    originalUrl: res.url,
    authorName: res.author_name,
    authorUrl: res.author_url,
  });
  return { res, medium };
}

/* YouTube */

async function youtubePost(pageUrl: string) {
  const { res, medium } = await youtubeMedium(pageUrl);
  const pin = new Pin();
  pin.title = _.get(res, 'items[0].snippet.title');
  pin.description = _.get(res, 'items[0].snippet.description');
  pin.addMedium(medium);
  // Descriptions often credit their sources or link the full story.
  const { channelTitle, publishedAt } = _.get(res, 'items[0].snippet', {});
  const text = [
    `Title: ${pin.title || ''}`,
    `Channel: ${channelTitle || ''}`,
    `Published: ${publishedAt || ''}`,
    '',
    `Description:\n${pin.description || ''}`,
  ].join('\n');
  return addReferences(pin, await findReferences(pageUrl, text, 'YouTube video'));
}

async function youtubeMedium(pageUrl: string) {
  const { id } = getVideoId(pageUrl);
  if (!id) {
    throw new Error(`No YouTube video id in ${pageUrl}`);
  }
  const res = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?part=player,snippet&id=${encodeURIComponent(id)}&maxResults=1&key=${config.youtube.apiKey}`,
  );
  const html: string = _.get(res, 'items[0].player.embedHtml');
  const originalUrl = html.match(/(?<=src=").*?(?=[?"])/)![0];
  const medium = new Medium({ type: mediumID.youtube, html, originalUrl });
  return { res, medium };
}

/* Any other web page */

async function webScrape(pageUrl: string) {
  // Loaded lazily: puppeteer is heavy and only this path needs it.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    executablePath: config.chromiumPath,
    // Chromium's sandbox needs privileges the container does not grant.
    args: ['--no-sandbox'],
    acceptInsecureCerts: true,
    headless: true,
    defaultViewport: { width: 1280, height: 1200 },
  });

  let pageText = '';
  let pin: Pin;
  try {
    const [page] = await browser.pages();
    page.setDefaultNavigationTimeout(NAVIGATION_WAIT_MS);
    await page.setRequestInterception(true);
    // Stay on the page asked for: block redirects and script-driven
    // navigation away from it (https://github.com/puppeteer/puppeteer/issues/823).
    page.on('request', (req) => {
      const leavesPage =
        req.url().split('://')[1] !== pageUrl.split('://')[1] &&
        req.isNavigationRequest() &&
        req.frame() === page.mainFrame() &&
        req.url() !== pageUrl;
      if (leavesPage) {
        req.respond(req.redirectChain().length ? { body: '' } : { status: 204 });
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(pageUrl);
    } catch (err) {
      // A slow page is still worth scraping for what did load.
      if ((err as Error).name !== 'TimeoutError') {
        throw err;
      }
    }

    // Scrolling wakes lazy-loaded players.
    await page.keyboard.press('PageDown');
    await page.waitForSelector('iframe[src*="www.youtube.com"]', { timeout: 500 }).catch(() => undefined);
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForSelector('iframe[src*="www.youtube.com"]', { timeout: 500 }).catch(() => undefined);

    const found = (await page.evaluate(IN_PAGE_SCRAPE)) as InPageResult;
    // Body text for the LLM pass below, read while the page is still open.
    pageText = ((await page.evaluate('document.body ? document.body.innerText : ""').catch(() => '')) as string) || '';

    pin = new Pin();
    (found.media || []).forEach((m) => {
      if (m.width > 150 && m.height > 150) {
        pin.addMedium(
          new Medium({ type: mediumID.image, originalWidth: m.width, originalHeight: m.height, originalUrl: m.originalUrl }),
        );
      }
    });

    const embeds = await Promise.all([
      ...(found.youtube || []).map((url) => youtubeMedium(unwrapEmbedly(url)).catch(() => null)),
      ...(found.twitter || []).map((url) => twitterMedium(url).catch(() => null)),
    ]);
    embeds.forEach((embed) => {
      if (embed && !pin.findMediumByOriginalUrl(embed.medium.originalUrl)) {
        pin.unshiftMedium(embed.medium);
      }
    });
  } catch (err) {
    console.error((err as Error).message);
    throw { err: (err as Error).message };
  } finally {
    await browser.close();
  }

  // After the browser is gone, so the page is not held open for the calls.
  const [fields, found] = await Promise.all([extractPinFields(pageUrl, pageText), findReferences(pageUrl, pageText)]);
  return addReferences(applyExtracted(pin, fields), found);
}

// Embedly wraps the real player URL in its src query parameter.
function unwrapEmbedly(url: string) {
  if (!url.startsWith('https://embedly')) {
    return url;
  }
  const src = new URL(url).searchParams.get('src');
  return src ? decodeURIComponent(src.replace(/\+/g, ' ')) : url;
}

// Everything the create form reads off a scrape other than the media it
// picks from.
function applyExtracted(pin: Pin, fields: ExtractedFields | null): Pin {
  if (!fields) return pin;

  if (fields.title) pin.title = fields.title;
  if (fields.description) pin.description = fields.description;

  if (Number.isFinite(fields.price)) {
    pin.price = fields.price;
    pin.priceCurrency = fields.priceCurrency || undefined;
  }

  const location = toLocation(fields);
  if (location) {
    pin.address = location.address;
    pin.latitude = location.latitude;
    pin.longitude = location.longitude;
  }

  if (fields.dateConfidence) {
    pin.dateConfidence = fields.dateConfidence;
    pin.dateConfidenceReasoning = fields.dateConfidenceReasoning || undefined;
  }

  if (fields.company) {
    pin.company = fields.company;
    pin.companyWikiUrl = fields.companyWikiUrl || undefined;
  }

  if (fields.category) pin.category = fields.category;
  if (fields.amazonUrl) pin.addMerchant(new Merchant({ label: 'Amazon', url: fields.amazonUrl }));
  if (fields.bestBuyUrl) pin.addMerchant(new Merchant({ label: 'Best Buy', url: fields.bestBuyUrl }));
  if (fields.longFormSummary) pin.longFormSummary = fields.longFormSummary;

  if (fields.startDateTime) {
    pin.utcStartDateTime = new Date(fields.startDateTime);
    pin.utcEndDateTime = fields.endDateTime ? new Date(fields.endDateTime) : undefined;
    pin.allDay = fields.allDay;
  }
  return pin;
}
