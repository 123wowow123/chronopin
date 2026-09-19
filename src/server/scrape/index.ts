import getVideoId from 'get-video-id';
import _ from 'lodash';
import config from '../config';
import { extractPinFields, toLocation, type ExtractedFields } from '../extract';
import { findReferences, type FoundReferences } from '../extract/references';
import Medium from '../model/medium';
import Merchant from '../model/merchant';
import Pin from '../model/pin';
import PinRating from '../model/pinRating';
import PinReference from '../model/pinReference';
import { inBackground } from '../background';
import Source from '../model/source';
import { fetchJson } from '../util/fetchJson';
import log from '../util/log';
import { parseScrapedStocks, type ScrapedStock } from '@/lib/stocks';
import { isStudioCategory, studioLocationByName } from '../studioLocation';
import { sourceKind } from '@/lib/sourceKind';
import { IN_PAGE_SCRAPE, type InPageResult } from './inPage';
import { wikiImages } from './wikiImages';
import { findScreenDetails, isScreenCategory, youtubeStill, type ScreenDetails } from './screen';

const { scrapeType, mediumID } = config;
const NAVIGATION_WAIT_MS = 8000;
// A pin reads best with a few pictures, so a scrape looks further afield
// until it has this many.
export const TARGET_IMAGES = 3;

// Builds a draft pin from a URL: a tweet or YouTube video becomes a pin around
// that embed; any other page is loaded in headless Chrome for its images and
// embeds, then read by the LLM extractor for everything else.
export async function scrape(pageUrl: string) {
  const domain = pageUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/?\n]+)/)?.[1];
  let type: string;
  let pin: Pin;
  let trailer: Medium | undefined;
  let stocks: ScrapedStock[] | undefined;
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
      ({ pin, trailer, stocks } = await webScrape(pageUrl));
      break;
  }
  // trailer is also in media; the form keeps it alongside whichever picture
  // the author picks as the heading. stocks are the article's tickers, which
  // POST /api/pins adds once the pin is saved.
  return Object.assign({}, pin.toJSON(), { type }, trailer ? { trailer: trailer.toJSON() } : {}, stocks?.length ? { stocks } : {});
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
  const text = tweetText(res.html);
  await addLinkedImages(pin, text);
  return addReferences(pin, await findReferences(pageUrl, text, 'tweet'));
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

export async function twitterMedium(pageUrl: string) {
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
  await addVideoStills(pin, medium.originalUrl!);
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

export async function youtubeMedium(pageUrl: string) {
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

export async function launchBrowser() {
  // Loaded lazily: puppeteer is heavy and only page loads need it.
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    executablePath: config.chromiumPath,
    // Chromium's sandbox needs privileges the container does not grant.
    args: ['--no-sandbox'],
    acceptInsecureCerts: true,
    headless: true,
    defaultViewport: { width: 1280, height: 1200 },
  });
}

async function webScrape(pageUrl: string): Promise<{ pin: Pin; trailer?: Medium; stocks?: ScrapedStock[] }> {
  const browser = await launchBrowser();

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

  // Kept for the page's wiki, written once a pin cites it, so that need not
  // load the page again (services/sourceWiki.ts).
  inBackground(
    Source.rememberText(pageUrl, sourceKind(pageUrl), pageText).catch((err) => log.warn('keeping scraped text failed:', (err as Error).message)),
  );

  // After the browser is gone, so the page is not held open for the calls.
  // A film, series or anime is looked up as soon as the extractor names it,
  // alongside the reference search. A page that embeds a video of its own
  // keeps that one rather than gaining a searched-for trailer.
  const hasVideo = pin.media.some((m) => Number(m.type) === mediumID.youtube);
  const [{ fields, screen }, found] = await Promise.all([
    extractPinFields(pageUrl, pageText).then(async (fields) => ({
      fields,
      screen: isScreenCategory(fields?.category)
        ? await findScreenDetails({
            workTitle: fields!.workTitle,
            pinTitle: fields!.title,
            category: fields!.category,
            year: fields!.startDateTime ? new Date(fields!.startDateTime).getUTCFullYear() : undefined,
            skipTrailer: hasVideo,
          })
        : undefined,
    })),
    findReferences(pageUrl, pageText),
  ]);
  applyExtracted(pin, fields);
  await placeAtStudioHq(pin);
  const trailer = applyScreenDetails(pin, screen);
  await topUpImages(pin, fields);
  return { pin: addReferences(pin, found), trailer, stocks: parseScrapedStocks(fields?.stocks) };
}

const imageCount = (pin: Pin) => pin.media.filter((m) => Number(m.type) === mediumID.image).length;

// Pages with few pictures of their own are topped up from the Wikipedia
// article for the work, else the company, else the pin's title. Added after
// the page's own media, so the page's picture stays the default heading.
async function topUpImages(pin: Pin, fields: ExtractedFields | null) {
  for (const subject of [fields?.workTitle, fields?.companyWikiUrl || fields?.company, fields?.title]) {
    const need = TARGET_IMAGES - imageCount(pin);
    if (need <= 0) return;
    for (const img of await wikiImages(subject, need + 2)) {
      if (imageCount(pin) >= TARGET_IMAGES) return;
      if (!pin.findMediumByOriginalUrl(img.originalUrl)) {
        pin.addMedium(new Medium({ type: mediumID.image, originalWidth: img.width, originalHeight: img.height, originalUrl: img.originalUrl }));
      }
    }
  }
}

const IMAGE_FETCH_MS = 5000;

// Other frames of a YouTube video, as pictures. Best effort: a frame that
// does not exist is skipped.
async function addVideoStills(pin: Pin, embedUrl: string) {
  const id = embedUrl.match(/\/embed\/([\w-]{6,})/)?.[1];
  if (!id) return;
  for (const name of ['hqdefault', 'hq1', 'hq2', 'hq3']) {
    if (imageCount(pin) >= TARGET_IMAGES) return;
    const originalUrl = `https://i.ytimg.com/vi/${id}/${name}.jpg`;
    const ok = await fetch(originalUrl, { method: 'HEAD', signal: AbortSignal.timeout(IMAGE_FETCH_MS) }).then((r) => r.ok, () => false);
    if (ok) pin.addMedium(new Medium({ type: mediumID.image, originalWidth: 480, originalHeight: 360, originalUrl }));
  }
}

// A tweet's pictures live behind its links: the preview image of each
// page it links to (not another tweet or a t.co / pic. redirect to one).
async function addLinkedImages(pin: Pin, text: string) {
  const links = [...text.matchAll(/\((https?:\/\/[^\s)]+)\)/g)].map((m) => m[1]).filter((u) => !/\/\/(?:[\w-]+\.)?(?:twitter|x)\.com\//.test(u));
  for (const link of links.slice(0, 3)) {
    if (imageCount(pin) >= TARGET_IMAGES) return;
    try {
      const res = await fetch(link, { redirect: 'follow', signal: AbortSignal.timeout(IMAGE_FETCH_MS), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronoPin)' } });
      if (!res.ok || !String(res.headers.get('content-type')).includes('html')) continue;
      const html = (await res.text()).slice(0, 200000);
      const tag = html.match(/<meta[^>]+(?:property|name)=["'](?:og|twitter):image["'][^>]*>/i)?.[0];
      const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
      if (!content) continue;
      const originalUrl = new URL(content.replace(/&amp;/g, '&'), res.url).href;
      if (!pin.findMediumByOriginalUrl(originalUrl)) pin.addMedium(new Medium({ type: mediumID.image, originalUrl }));
    } catch {
      // an unreachable link just adds nothing
    }
  }
}

// Ratings onto the pin, and the trailer onto the end of its media (so the
// page's own picture stays the default heading), with the trailer's still as
// a picture when the page had none.
function applyScreenDetails(pin: Pin, screen: ScreenDetails | undefined): Medium | undefined {
  if (!screen) return undefined;
  screen.ratings.forEach((r) => pin.addRating(new PinRating(r)));
  if (!screen.trailer) return undefined;
  const hasImage = pin.media.some((m) => Number(m.type) === mediumID.image);
  const still = youtubeStill(screen.trailer.originalUrl!);
  if (!hasImage && still) pin.addMedium(new Medium(still));
  const trailer = new Medium(screen.trailer);
  pin.addMedium(trailer);
  return trailer;
}

// Embedly wraps the real player URL in its src query parameter.
function unwrapEmbedly(url: string) {
  if (!url.startsWith('https://embedly')) {
    return url;
  }
  const src = new URL(url).searchParams.get('src');
  return src ? decodeURIComponent(src.replace(/\+/g, ' ')) : url;
}

// A film, series, anime or game is made at a studio but happens nowhere in
// particular: with no place from the page, it goes on the map at the
// studio's headquarters (Wikidata, src/server/studioLocation.ts).
async function placeAtStudioHq(pin: Pin): Promise<void> {
  if (pin.latitude != null || pin.address || !pin.company || !isStudioCategory(pin.category)) return;
  const hq = await studioLocationByName(pin.company, pin.companyWikiUrl);
  if (!hq) return;
  pin.address = hq.address;
  pin.latitude = hq.latitude;
  pin.longitude = hq.longitude;
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
