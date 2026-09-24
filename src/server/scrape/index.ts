import getVideoId from 'get-video-id';
import _ from 'lodash';
import config from '../config';
import { extractPinFields, extractTask, getClient, toLocation, type ExtractedFields } from '../extract';
import { findReferences, referencesTask, type FoundReferences, type SourceKind } from '../extract/references';
import { metadataFields } from './metadata';
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
import { parseCategories } from '@/lib/categories';
import { parseTags } from '@/lib/tags';
import { isStudioCategory, studioLocationByName } from '../studioLocation';
import { awardsFor } from '../services/pinAwards';
import type { AwardEntry } from '@/lib/awards';
import { sourceKind } from '@/lib/sourceKind';
import { IN_PAGE_HEADINGS, IN_PAGE_META, IN_PAGE_SCRAPE, type InPageHeadings, type InPageResult, type PageMetadata } from './inPage';
import { pageEntries, type PageEntry } from '@/lib/pageEntries';
import { findPinImages, pageImage } from './findImages';
import { findProductVideo, findScreenDetails, isScreenCategory, malIdOf, workCategory, youtubeStill, type ScreenDetails } from './screen';
import { findScoreMarket, GAME_CATEGORIES, scoreSiteFor, withScoreMarket, type ScoreMarket } from './scoreMarkets';
import { seriesPinFor } from './modelSeries';
import { prequelPinFor } from './prequel';
import { picturesNeeded, videosNeeded } from '@/lib/mediaTarget';
import { noteLinks, type NoteLink } from './noteLinks';

const { scrapeType, mediumID } = config;
const NAVIGATION_WAIT_MS = 8000;

// Builds a draft pin from a URL: a tweet or YouTube video becomes a pin around
// that embed; any other page is loaded in headless Chrome for its images and
// embeds, then read by the LLM extractor for everything else. note is what the
// person pinning it said about it: which event they mean, what matters.
export async function scrape(pageUrl: string, { note }: { note?: string } = {}) {
  // Links in the note: its media join the pin's (addNoteMedia); the rest are
  // for the reference search, which reads them from the note itself.
  const links = noteLinks(note, pageUrl).catch((err) => {
    log.warn('reading the note\'s links failed:', (err as Error).message);
    return [] as NoteLink[];
  });
  const domain = pageUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/?\n]+)/)?.[1];
  let type: string;
  let pin: Pin;
  let trailer: Medium | undefined;
  let stocks: ScrapedStock[] | undefined;
  let awards: AwardEntry[] | undefined;
  let tags: string[] | undefined;
  let respondTo: { id: number; title: string } | undefined;
  let entries: PageEntries | undefined;
  let llmTasks: LlmTask[] | undefined;
  switch (domain) {
    case 'twitter.com':
    case 'x.com':
      type = scrapeType.twitter;
      ({ pin, llmTasks } = await twitterPost(pageUrl, note, links));
      break;
    case 'youtu.be':
    case 'youtube.com':
      type = scrapeType.youtube;
      ({ pin, llmTasks } = await youtubePost(pageUrl, note, links));
      break;
    default:
      type = scrapeType.web;
      ({ pin, trailer, stocks, awards, tags, respondTo, entries, llmTasks } = await webScrape(pageUrl, note, links));
      break;
  }
  // trailer is also in media; the form keeps it alongside whichever picture
  // the author picks as the heading. stocks are the article's tickers, which
  // POST /api/pins adds once the pin is saved.
  // awards: what the work won or was nominated for, for the form to show; the
  // pin's save matches them again from its title (services/pinAwards.ts).
  // respondTo: the earlier season's (./prequel.ts) or model version's
  // (./modelSeries.ts) pin this one follows on from, for the form to post it
  // as a response to.
  // entries: a release-notes or changelog page's dated entries, for the form
  // to offer one pin per entry (src/lib/pageEntries.ts).
  return Object.assign(
    {},
    pin.toJSON(),
    { type },
    trailer ? { trailer: trailer.toJSON() } : {},
    stocks?.length ? { stocks } : {},
    tags?.length ? { tags } : {},
    awards?.length ? { awards: awards.map(({ workArticle: _article, ...a }) => a) } : {},
    respondTo ? { respondTo } : {},
    entries ? { entries } : {},
    // No LLM answer: everything else ran, and these are what is left to do.
    llmTasks?.length ? { llm: 'session', llmTasks } : {},
  );
}

type PageEntries = { pageTitle: string; list: PageEntry[] };

// A Claude call the scrape could not make (no API key or credit): the same
// prompt, schema and input, for a Claude Code session to answer by hand. Every
// other stage of a scrape runs without one.
export type LlmTask = ReturnType<typeof extractTask> | ReturnType<typeof referencesTask>;

// The reference search for a source, as a task, when the API is unavailable.
const referenceTasks = (url: string, text: string, kind: SourceKind, note?: string): LlmTask[] | undefined =>
  getClient() ? undefined : [referencesTask(url, text, kind, note)];

// The page's dated entries, each marked with the pin already made from it.
async function readEntries(pageUrl: string, read: InPageHeadings | null): Promise<PageEntries | undefined> {
  const list = read ? pageEntries(pageUrl, read.headings) : [];
  if (!list.length) return undefined;
  const existing = await Pin.findBySourceUrls(list.map((e) => e.url));
  return { pageTitle: read!.title, list: list.map((e) => (existing.has(e.url) ? { ...e, existing: existing.get(e.url) } : e)) };
}

// The references found for a pin, and the summary they ground, when one was
// written - it is preferred to a summary of the source alone.
function addReferences(pin: Pin, { references, longFormSummary }: FoundReferences): Pin {
  references.forEach((r) => pin.addReference(new PinReference(r)));
  if (longFormSummary) pin.longFormSummary = longFormSummary;
  return pin;
}

/* Twitter */

async function twitterPost(pageUrl: string, note?: string, links?: Promise<NoteLink[]>) {
  const { res, medium } = await twitterMedium(pageUrl);
  const pin = new Pin().addMedium(medium);
  const text = tweetText(res.html);
  await addLinkedImages(pin, text);
  await addNoteMedia(pin, (await links) ?? []);
  const llmTasks = referenceTasks(pageUrl, text, 'tweet', note);
  return { pin: addReferences(pin, await findReferences(pageUrl, text, 'tweet', note)), llmTasks };
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

async function youtubePost(pageUrl: string, note?: string, links?: Promise<NoteLink[]>) {
  const { res, medium } = await youtubeMedium(pageUrl);
  const pin = new Pin();
  pin.title = _.get(res, 'items[0].snippet.title');
  pin.description = _.get(res, 'items[0].snippet.description');
  pin.addMedium(medium);
  await addVideoStills(pin, medium.originalUrl!);
  await addNoteMedia(pin, (await links) ?? []);
  // Descriptions often credit their sources or link the full story.
  const { channelTitle, publishedAt } = _.get(res, 'items[0].snippet', {});
  const text = [
    `Title: ${pin.title || ''}`,
    `Channel: ${channelTitle || ''}`,
    `Published: ${publishedAt || ''}`,
    '',
    `Description:\n${pin.description || ''}`,
  ].join('\n');
  const llmTasks = referenceTasks(pageUrl, text, 'YouTube video', note);
  return { pin: addReferences(pin, await findReferences(pageUrl, text, 'YouTube video', note)), llmTasks };
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

async function webScrape(pageUrl: string, note?: string, links?: Promise<NoteLink[]>): Promise<{
  pin: Pin;
  trailer?: Medium;
  stocks?: ScrapedStock[];
  awards?: AwardEntry[];
  tags?: string[];
  respondTo?: { id: number; title: string };
  entries?: PageEntries;
  llmTasks?: LlmTask[];
}> {
  const browser = await launchBrowser();

  let pageText = '';
  let headings: InPageHeadings | null = null;
  let pageMeta: PageMetadata | null = null;
  let pin: Pin;
  try {
    const [page] = await browser.pages();
    page.setDefaultNavigationTimeout(NAVIGATION_WAIT_MS);
    // Cloudflare holds "HeadlessChrome" on its challenge page (help.openai.com
    // among others); the same browser named plainly is let through.
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
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
    headings = (await page.evaluate(IN_PAGE_HEADINGS).catch((err) => {
      log.warn('reading headings failed:', (err as Error).message);
      return null;
    })) as InPageHeadings | null;

    pageMeta = (await page.evaluate(IN_PAGE_META).catch(() => null)) as PageMetadata | null;

    pin = new Pin();
    // A page without a usable picture or embed still gets a list to add to.
    pin.media = [];
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

  // The author's own media lead the page's, and count toward how many
  // pictures and videos the top-ups below look for.
  await addNoteMedia(pin, (await links) ?? [], { lead: true });

  // After the browser is gone, so the page is not held open for the calls.
  // A film, series or anime is looked up as soon as the extractor names it,
  // alongside the reference search. A page that embeds a video of its own
  // keeps that one rather than gaining a searched-for trailer. So is a
  // film's, show's or game's review score on Kalshi (./scoreMarkets.ts).
  const hasVideo = pin.media.some((m) => Number(m.type) === mediumID.youtube);
  const [{ fields, screen, scoreMarket }, found] = await Promise.all([
    extractPinFields(pageUrl, pageText, note).then(async (fields) => {
      // The category that says what kind of work it is, of the ones it has.
      const work = {
        workTitle: fields?.workTitle,
        pinTitle: fields?.title,
        category: workCategory(fields?.categories, GAME_CATEGORIES),
        year: fields?.startDateTime ? new Date(fields.startDateTime).getUTCFullYear() : undefined,
        // A MyAnimeList page names the work by id; a title cannot always.
        malId: malIdOf([pageUrl]),
        // The studio or licensor, so its own channel wins the trailer search.
        company: fields?.company,
      };
      const [screen, scoreMarket] = await Promise.all([
        isScreenCategory(fields?.categories) ? findScreenDetails({ ...work, skipTrailer: hasVideo }) : undefined,
        scoreSiteFor(fields?.categories) ? findScoreMarket(work) : undefined,
      ]);
      return { fields, screen, scoreMarket };
    }),
    findReferences(pageUrl, pageText, 'web page', note),
  ]);
  // With no LLM answer the page's own markup (Open Graph, meta tags, JSON-LD)
  // still gives a title, description and whatever date it states.
  const llmDown = !fields;
  applyExtracted(pin, fields ?? metadataFields(pageMeta));
  await placeAtStudioHq(pin);
  const trailer = applyScreenDetails(pin, screen, scoreMarket);
  // References first: the top-up takes pictures from the day's articles.
  addReferences(pin, found);
  await topUpImages(pin, fields, headings?.title);
  await topUpVideo(pin, fields, headings?.title);
  // A film, series or anime's awards, by the work's own title and the pin's.
  const awards = isScreenCategory(pin.categories)
    ? await awardsFor([fields?.workTitle, pin.title]).catch((err) => {
        log.warn('award lookup failed:', (err as Error).message);
        return [];
      })
    : [];
  // tags: the extracted ones, for the form's tags field; the awards the
  // pin's text names are tagged again on save (model/pinTag.ts). What an
  // anime was adapted from is a fact about the work rather than the page, so
  // it comes from AniList rather than the extractor, and goes last so it
  // never costs the page's own tags a place.
  const tags = [...(parseTags(fields?.tags) ?? []), ...(screen?.adaptedFrom ? [screen.adaptedFrom] : [])];
  const respondTo = (await prequelPinFor(pin, pageUrl)) ?? (await seriesPinFor(pin));
  const entries = await readEntries(pageUrl, headings).catch((err) => {
    log.warn('reading entries failed:', (err as Error).message);
    return undefined;
  });
  const llmTasks: LlmTask[] | undefined =
    llmDown && pageText.trim().length >= 200 ? [extractTask(pageUrl, pageText, note), referencesTask(pageUrl, pageText, 'web page', note)] : undefined;
  return { pin, trailer, stocks: parseScrapedStocks(fields?.stocks), awards, tags: tags.length ? tags : metadataFields(pageMeta).tags, respondTo, entries, llmTasks };
}

const imageCount = (pin: Pin) => pin.media.filter((m) => Number(m.type) === mediumID.image).length;
const needMore = (pin: Pin) => picturesNeeded(pin.media.length, imageCount(pin)) > 0;

// Pages with few media of their own are topped up from the company's
// announcement, the referenced articles and Wikipedia (./findImages.ts),
// which may also bring the announcement as a reference. Added after the
// page's own media, so the page's picture stays the default heading.
// pageTitle is the page's own <title>, the search term when the extractor gave
// no title (no API key or credit), so a scrape still looks for pictures.
async function topUpImages(pin: Pin, fields: ExtractedFields | null, pageTitle?: string) {
  const need = picturesNeeded(pin.media.length, imageCount(pin));
  if (need <= 0) return;
  const { images, references } = await findPinImages(
    {
      title: pin.title || fields?.title || pageTitle?.trim() || '',
      company: pin.company ?? fields?.company,
      companyWikiUrl: pin.companyWikiUrl ?? fields?.companyWikiUrl,
      workTitle: fields?.workTitle,
      utcStartDateTime: pin.utcStartDateTime,
      references: pin.references,
    },
    need,
    pin.media.map((m) => m.originalUrl!),
  );
  images.forEach((img) =>
    pin.addMedium(new Medium({ type: mediumID.image, originalWidth: img.width || undefined, originalHeight: img.height || undefined, originalUrl: img.originalUrl })),
  );
  references.forEach((r) => pin.addReference(new PinReference(r)));
}

// A pin with no video (its page embedded none, no trailer was found) gets an
// official or press one from YouTube, after the pictures. Best effort: a pin
// that finds none is saved without.
async function topUpVideo(pin: Pin, fields: ExtractedFields | null, pageTitle?: string) {
  if (videosNeeded(pin.media.filter((m) => Number(m.type) === mediumID.youtube).length) <= 0) return;
  const title = pin.title || fields?.title || pageTitle?.trim();
  if (!title) return;
  const video = await findProductVideo({ title, company: pin.company ?? fields?.company, year: pin.utcStartDateTime?.getUTCFullYear() });
  if (video) pin.addMedium(new Medium(video));
}

const IMAGE_FETCH_MS = 5000;

// The media links in the note of the person pinning the page, through the
// same steps as the page's own: a YouTube video as its embed and stills, a
// tweet as its embed and the pictures of the pages it links to, a picture as
// it is (saving the pin downloads, sizes and de-duplicates it like any
// other). lead puts them before the page's media, so the author's first is
// the pin's heading. A link that cannot be read is skipped.
async function addNoteMedia(pin: Pin, links: NoteLink[], { lead = false } = {}) {
  const primary: Medium[] = [];
  const extras: (() => Promise<void>)[] = [];
  for (const { url, kind } of links) {
    try {
      if (kind === 'youtube') {
        const { medium } = await youtubeMedium(url);
        primary.push(medium);
        extras.push(() => addVideoStills(pin, medium.originalUrl!));
      } else if (kind === 'tweet') {
        // twitterMedium wants the bare status id at the end of the link.
        const id = url.match(/\/status(?:es)?\/(\d+)/)![1];
        const { res, medium } = await twitterMedium(`https://x.com/i/status/${id}`);
        primary.push(medium);
        extras.push(() => addLinkedImages(pin, tweetText(res.html)));
      } else if (kind === 'image') {
        primary.push(new Medium({ type: mediumID.image, originalUrl: url }));
      }
    } catch (err) {
      log.warn(`note link ${url} skipped:`, (err as Error).message);
    }
  }
  const taken = new Set((pin.media || []).map((m) => m.originalUrl));
  const fresh = primary.filter((m) => m.originalUrl && !taken.has(m.originalUrl) && taken.add(m.originalUrl));
  if (lead) [...fresh].reverse().forEach((m) => pin.unshiftMedium(m));
  else fresh.forEach((m) => pin.addMedium(m));
  for (const extra of extras) await extra();
}

// Other frames of a YouTube video, as pictures. Best effort: a frame that
// does not exist is skipped.
async function addVideoStills(pin: Pin, embedUrl: string) {
  const id = embedUrl.match(/\/embed\/([\w-]{6,})/)?.[1];
  if (!id) return;
  for (const name of ['hqdefault', 'hq1', 'hq2', 'hq3']) {
    if (!needMore(pin)) return;
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
    if (!needMore(pin)) return;
    // an unreachable link just adds nothing
    const originalUrl = await pageImage(link).catch(() => undefined);
    if (originalUrl && !pin.findMediumByOriginalUrl(originalUrl)) pin.addMedium(new Medium({ type: mediumID.image, originalUrl }));
  }
}

// Ratings and the episode count onto the pin, with Kalshi's score for the work,
// its streaming services as merchants ("Watch on Netflix"), and the trailer
// onto the end of its media (so the page's own picture stays the default
// heading), with the trailer's still as a picture when the page had none.
function applyScreenDetails(pin: Pin, screen: ScreenDetails | undefined, scoreMarket: ScoreMarket | undefined): Medium | undefined {
  withScoreMarket(screen?.ratings ?? [], scoreMarket).forEach((r) => pin.addRating(new PinRating(r)));
  screen?.streaming.forEach((link) => {
    if (!pin.merchants?.some((m) => m.url === link.url)) pin.addMerchant(new Merchant(link));
  });
  // Only when the page did not say how many episodes: AniList and Wikidata
  // know the show, but the article knows which run the pin is about.
  if (screen?.episodes && !pin.episodeCount) {
    pin.episodeCount = screen.episodes.episodeCount;
    pin.episodeStatus = screen.episodes.episodeStatus;
  }
  if (!screen?.trailer) return undefined;
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
  if (pin.latitude != null || pin.address || !pin.company || !isStudioCategory(pin.categories)) return;
  const hq = await studioLocationByName(pin.company, pin.companyWikiUrl);
  if (!hq) return;
  pin.address = hq.address;
  pin.latitude = hq.latitude;
  pin.longitude = hq.longitude;
}

// Everything the create form reads off a scrape other than the media it
// picks from.
function applyExtracted(pin: Pin, fields: Partial<ExtractedFields> | null): Pin {
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
  if (fields.originalStartDate && /^\d{4}-\d{2}-\d{2}$/.test(fields.originalStartDate)) {
    pin.originalStartDate = fields.originalStartDate;
    pin.delayReasoning = fields.delayReasoning || undefined;
  }
  // The page's own episode count, which beats the catalogues' below: it is
  // the count for the run this pin is about.
  if (Number.isInteger(fields.episodeCount) && (fields.episodeCount as number) > 0) {
    pin.episodeCount = fields.episodeCount;
    pin.episodeStatus = fields.episodeStatus || undefined;
  }

  if (fields.company) {
    pin.company = fields.company;
    pin.companyWikiUrl = fields.companyWikiUrl || undefined;
  }

  if (fields.categories?.length) pin.categories = parseCategories(fields.categories);
  if (fields.amazonUrl) pin.addMerchant(new Merchant({ label: 'Amazon', url: fields.amazonUrl }));
  if (fields.longFormSummary) pin.longFormSummary = fields.longFormSummary;

  if (fields.startDateTime) {
    pin.utcStartDateTime = new Date(fields.startDateTime);
    pin.utcEndDateTime = fields.endDateTime ? new Date(fields.endDateTime) : undefined;
    pin.allDay = fields.allDay;
    // Only a claim about an all-day pin (schema 0057).
    pin.allDayStated = !!fields.allDay && !!fields.allDayStated;
  }
  return pin;
}
