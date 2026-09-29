// Pictures (and the pages they come from) for a pin whose own page has too
// few - a help-center release note, a changelog entry. In order:
//   1. the company's own announcement on its community forum (a Discourse
//      site: OpenAI's launch posts carry the launch art and benchmark charts),
//      which is also cited as a reference;
//   2. the lead image of each referenced article from the pin's day;
//   3. Wikipedia (./wikiImages.ts), for the work, the title, else the company.
// The company's announcement, when it has pictures, is enough on its own.
// Everything here is best effort: a source that fails adds nothing.

import { modelReleases } from '@/lib/modelSeries';
import { sameImageKey } from '../imageHash';
import log from '../util/log';
import { wikiImages, type WikiImage } from './wikiImages';

export type FoundImage = WikiImage;
export type FoundReference = { url: string; title: string; confidence: number; publishedDate?: string; reasoning: string };

// The companies with an official Discourse forum, and the category their
// launches are announced in.
const FORUMS: Record<string, { name: string; base: string; category: string }> = {
  openai: { name: "OpenAI's developer community", base: 'https://community.openai.com', category: 'announcements' },
};

const FETCH_MS = 6000;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; Chronopin/1.0)', Accept: 'application/json, text/html' };
const MIN_SIDE = 150;
// An announcement can come weeks ahead ("coming July 9"), but not after.
const DAYS_BEFORE = 30;
const DAYS_AFTER = 3;
const TOPICS_CHECKED = 5;
const DAY_MS = 86_400_000;

// Words that say something happened rather than what: they do not tell two
// announcements about one model apart.
const GENERIC = new Set(
  (
    'a an and the of to in on for with by at from is are now new its it this our more ' +
    'released release releases releasing introducing introduces introduce launch launches launched launching ' +
    'announcing announces announced update updates updated updating rolls roll rolled rolling out comes come coming ' +
    'available availability here gets get adds add brings bring makes make enters beta preview live ' +
    'chatgpt api openai model models improves improved improvement improvements better'
  ).split(' '),
);

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? [];

// What a title says beyond the model it names: "GPT-5.6 Sol Rolls Out in
// ChatGPT" -> ["sol"], "GPT-4o with Canvas Enters Beta" -> ["canvas"].
export function distinctiveWords(title: string): string[] {
  const modelWords = new Set(modelReleases(title).flatMap((r) => r.model.split(' ').slice(0, 2)));
  return words(title).filter((w) => !GENERIC.has(w) && !/^(?:gpt|o\d)[-\d.o]*$/.test(w) && !modelWords.has(w));
}

// The forum search for a pin: its title without the generic words.
export function forumQuery(title: string): string {
  return title
    .split(/\s+/)
    .filter((w) => !GENERIC.has(w.toLowerCase().replace(/[^a-z0-9.-]/g, '')))
    .join(' ');
}

const sameVersion = (a: number[], b: number[]) => a.length === b.length && a.every((n, i) => n === b[i]);
const family = (model: string) => model.split(' ')[0];

// Whether a forum topic announces what the pin is about: the same model
// (family and version) when the pin names one, and, when the pin's title
// says more than the model, at least one of those words too - so "GPT-5.4
// mini" does not take the art of "GPT-5.4 Pro and Thinking".
export function topicMatches(pinTitle: string, topicTitle: string): boolean {
  const pinModels = modelReleases(pinTitle);
  const topicModels = modelReleases(topicTitle);
  const topicWords = new Set(words(topicTitle));
  const extra = distinctiveWords(pinTitle);
  if (pinModels.length) {
    const sameModel = pinModels.some((p) => topicModels.some((t) => family(t.model) === family(p.model) && sameVersion(t.version, p.version)));
    return sameModel && (!extra.length || extra.some((w) => topicWords.has(w)));
  }
  return extra.filter((w) => topicWords.has(w)).length >= 2;
}

export function inWindow(topicDay: string, pinStart: Date | string): boolean {
  const diff = (new Date(topicDay).getTime() - new Date(pinStart).getTime()) / DAY_MS;
  return diff >= -DAYS_BEFORE && diff <= DAYS_AFTER + 1;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// The full-size pictures in a Discourse post: each lightbox links the
// original upload and states its size ("1533×863 217 KB").
export function discourseImages(cooked: string, base: string): FoundImage[] {
  const found: FoundImage[] = [];
  for (const m of cooked.matchAll(/<a\s[^>]*class="lightbox"[^>]*>[\s\S]*?<\/a>/g)) {
    const href = m[0].match(/\shref="([^"]+)"/)?.[1];
    const size = m[0].match(/(\d+)×(\d+)/);
    if (!href || !size) continue;
    const [width, height] = [Number(size[1]), Number(size[2])];
    if (width < MIN_SIDE || height < MIN_SIDE) continue;
    found.push({ originalUrl: new URL(decode(href), base).href, width, height });
  }
  return found.filter((img, i) => found.findIndex((o) => o.originalUrl === img.originalUrl) === i);
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

// The company's announcement of what the pin is about, with its pictures.
export async function forumAnnouncement(pin: { title: string; company?: string | null; utcStartDateTime: Date | string }) {
  const forum = FORUMS[(pin.company ?? '').toLowerCase()];
  const query = forumQuery(pin.title);
  if (!forum || !query) return undefined;
  const search = await getJson(`${forum.base}/search.json?q=${encodeURIComponent(`${query} #${forum.category}`)}`);
  const topics = ((search?.topics ?? []) as { id: number; slug: string; title: string; created_at: string }[])
    .filter((t) => inWindow(t.created_at, pin.utcStartDateTime) && topicMatches(pin.title, t.title))
    .slice(0, TOPICS_CHECKED);
  for (const topic of topics) {
    const full = await getJson(`${forum.base}/t/${topic.id}.json`);
    const images = discourseImages(full?.post_stream?.posts?.[0]?.cooked ?? '', forum.base);
    if (!images.length) continue;
    const reference: FoundReference = {
      url: `${forum.base}/t/${topic.slug}/${topic.id}`,
      title: topic.title,
      confidence: 80,
      publishedDate: topic.created_at.slice(0, 10),
      reasoning: `${pin.company}'s own announcement in ${forum.name}.`,
    };
    return { images, reference };
  }
  return undefined;
}

// A page's lead picture (its og:image or twitter:image).
export async function pageImage(url: string): Promise<string | undefined> {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(FETCH_MS), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronoPin)' } });
  if (!res.ok || !String(res.headers.get('content-type')).includes('html')) return undefined;
  const html = (await res.text()).slice(0, 200000);
  const tag = html.match(/<meta[^>]+(?:property|name)=["'](?:og|twitter):image["'][^>]*>/i)?.[0];
  const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
  return content ? new URL(decode(content), res.url).href : undefined;
}

const dayOf = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

// Up to need pictures (and the references they bring) for a pin, from the
// sources above; skip: pictures it already has.
export async function findPinImages(
  pin: {
    title: string;
    company?: string | null;
    companyWikiUrl?: string | null;
    workTitle?: string | null;
    // Without a start there is no telling which announcement or article day
    // is the pin's, so only Wikipedia is asked.
    utcStartDateTime?: Date | string | null;
    references?: { url: string; startDate?: string | null; publishedDate?: string | null }[];
  },
  need: number,
  skip: string[] = [],
): Promise<{ images: FoundImage[]; references: FoundReference[] }> {
  const images: FoundImage[] = [];
  const references: FoundReference[] = [];
  // By picture rather than by URL: a CDN's size suffix makes one poster look
  // like two (see sameImageKey). What that misses - the same picture from
  // another host - is caught once it is downloaded, in model/medium.ts.
  const seen = new Set(skip.filter(Boolean).map(sameImageKey));
  const add = (img: FoundImage) => {
    const key = sameImageKey(img.originalUrl);
    if (seen.has(key)) return;
    seen.add(key);
    images.push(img);
  };
  if (need <= 0 || !pin.title) return { images, references };

  const start = pin.utcStartDateTime && !isNaN(new Date(pin.utcStartDateTime).getTime()) ? pin.utcStartDateTime : undefined;
  const announced =
    start &&
    (await forumAnnouncement({ ...pin, utcStartDateTime: start }).catch((err) => {
      log.warn('forum image lookup failed:', (err as Error).message);
      return undefined;
    }));
  if (announced) {
    // An announcement's pictures belong together, so it may bring more than
    // need, and nothing less on point is added to them.
    announced.images.forEach(add);
    if (!(pin.references ?? []).some((r) => r.url === announced.reference.url)) references.push(announced.reference);
    if (images.length) return { images, references };
  }

  const day = start && dayOf(start);
  for (const ref of day ? (pin.references ?? []) : []) {
    if (images.length >= need) break;
    if ((ref.startDate ?? ref.publishedDate) !== day) continue;
    const originalUrl = await pageImage(ref.url).catch(() => undefined);
    // An og:image's size is unknown until it is fetched; 0 lets the thumb step measure it.
    if (originalUrl) add({ originalUrl, width: 0, height: 0 });
  }

  for (const subject of [pin.workTitle, pin.title, pin.companyWikiUrl || pin.company]) {
    if (images.length >= need) break;
    (await wikiImages(subject, need - images.length + 2)).slice(0, need - images.length).forEach(add);
  }
  return { images, references };
}
