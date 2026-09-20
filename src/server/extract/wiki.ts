/**
 * Claude's write-ups behind a pin's long-form summary (see
 * 0026_source_wiki.sql and src/server/services/sourceWiki.ts).
 *
 * writeWiki turns one link's text into a wiki: a root page for the whole
 * link and a sub-page for each distinct thing it covers. A source too long
 * for one call is read in parts - each part its own page, with its topics
 * below it - and the root is then written from the parts.
 *
 * composeSummary writes a pin's summary from the wikis of the links it
 * cites, never from the pages themselves, so a new link only costs its own
 * wiki and this one call.
 *
 * Both return null when there is no API key; they throw on a failed or
 * declined call, so the caller can record the failure and retry later - a
 * ServiceError when the fault is on the API's side rather than the link's.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { WikiDraft, WikiPage } from '../model/source';
import type { SourceKind } from '@/lib/sourceKind';
import { citeLabels } from './references';
import { describeError, getClient, MODEL } from '.';

// Text per wiki call; a longer source is split into parts of about this size.
export const PART_CHARS = 60000;
const MAX_PARTS = 6;
const MAX_TOPICS = 8;
const MAX_TAGS = 8;
// Wiki text handed to composeSummary before sub-pages are cut to their summaries.
const COMPOSE_BUDGET_CHARS = 120000;

export const KIND_LABEL: Record<SourceKind, string> = { web: 'web page', youtube: 'YouTube video', tweet: 'post on X', podcast: 'podcast episode page', pdf: 'PDF document' };

const PAGE_RULES = `Record only what the source itself says: what happens, who does it, where, and when (quote its date wording exactly, e.g. "expected in spring 2027"), costs and figures with their units, product names and versions, and short direct quotes where they carry a fact. Keep the source's own hedges ("reportedly", "planned"). Add nothing from your own knowledge and no opinions. Leave out navigation, ads, comments, sponsor reads and calls to subscribe.

title is what the page covers, not the site name. summary is one sentence saying what the page covers, used to decide whether to read it. body is Markdown - short sections or bullets, facts first. tags are up to ${MAX_TAGS} short lowercase subjects the page is about - organizations, places, products, people, kinds of event (e.g. "apple", "venice", "flood barrier") - for grouping pages across sources.`;

export const WIKI_PROMPT = `You write a small wiki for one source (a web page, video, post or podcast episode) so that later summaries can be written from the wiki instead of rereading the source. ${PAGE_RULES}

When the source covers several distinct things - a roundup's products, a keynote's announcements, a video's or podcast's segments, a project's phases - also write one topic page for each, at most ${MAX_TOPICS}, in the order the source has them, holding that thing's details; the main page then gives the overview and what ties them together. When the source is about one thing, write no topic pages.

lastModified is the day the source says it was published or last updated, as YYYY-MM-DD, or null when it does not say.`;

export const PART_NOTE = (part: number, parts: number) =>
  `This is part ${part} of ${parts} of a long source; write the page for this part alone, and title it for what this part covers.`;

export const ROOT_PROMPT = `You write the main page of a small wiki for one long source, from the pages already written for each of its parts. ${PAGE_RULES}

Give the overview of the whole source and the facts that matter most, drawn only from the part pages. lastModified is the day the parts say the source was published or last updated, as YYYY-MM-DD, or null when they do not say.`;

export const COMPOSE_PROMPT = `You write the long-form summary of an event pin on a timeline, from wikis already written about each link the pin cites. The pin's own title, description and dates say which event it is; a wiki may cover more than this event (a roundup, a long video), so use only what is about this pin's event.

Write the event's key points as an HTML bulleted list, "<ul><li>...</li></ul>" - real list markup, not prose and not markdown. Where one link adds to or updates another (a newer date, a cost, who is involved), say so, favouring the newer and more authoritative. Ground every point: end it with a citation of each link that backs it, by the label the link is given ([S] for the pin's source, [1], [2]... for the others), e.g. "<li>Opens to traffic on 18 September 2026 [S][2]</li>". Cite only what a link's wiki actually says. longFormSummary is null when the wikis hold too little about this event to summarize.`;

const TAGS = { type: 'array', items: { type: 'string' } };

// A main page (with lastModified) or a part page; either may have topics.
export const pageSchema = ({ topics, root }: { topics: boolean; root: boolean }) => ({
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    body: { type: 'string' },
    tags: TAGS,
    ...(root ? { lastModified: { type: ['string', 'null'] } } : {}),
    ...(topics
      ? {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, summary: { type: 'string' }, body: { type: 'string' }, tags: TAGS },
              required: ['title', 'summary', 'body', 'tags'],
              additionalProperties: false,
            },
          },
        }
      : {}),
  },
  required: ['title', 'summary', 'body', 'tags', ...(root ? ['lastModified'] : []), ...(topics ? ['topics'] : [])],
  additionalProperties: false,
});

export const COMPOSE_SCHEMA = {
  type: 'object',
  properties: { longFormSummary: { type: ['string', 'null'] } },
  required: ['longFormSummary'],
  additionalProperties: false,
};

// The API could not take the call (no credit, a bad key, rate limits, an
// outage): nothing to do with the link, so it should not use up its tries.
export class ServiceError extends Error {}

const isServiceFault = (err: unknown) =>
  err instanceof Anthropic.AuthenticationError ||
  err instanceof Anthropic.PermissionDeniedError ||
  err instanceof Anthropic.RateLimitError ||
  err instanceof Anthropic.APIConnectionError ||
  err instanceof Anthropic.InternalServerError ||
  (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message));

type TopicOut = { title: string; summary: string; body: string; tags: string[] };
type PageOut = TopicOut & { lastModified?: string | null; topics?: TopicOut[] };

// The parsed output, and the model that actually answered (a fallback model
// may stand in for MODEL).
export async function structured<T>(anthropic: Anthropic, system: string, schema: Record<string, unknown>, content: string): Promise<{ data: T; model: string }> {
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // A policy decline on Opus 5 is retried server-side on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    throw isServiceFault(err) ? new ServiceError(describeError(err)) : new Error(describeError(err));
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('declined by the model');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('ran out of output tokens');
  }
  const block = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
  if (!block) {
    throw new Error('no output');
  }
  return { data: JSON.parse(block.text) as T, model: response.model };
}

// Splits text into parts of at most size characters, at paragraph or
// sentence breaks where there is one in the last fifth of a part.
export function splitText(text: string, size = PART_CHARS, maxParts = MAX_PARTS): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > size && parts.length < maxParts - 1) {
    const window = rest.slice(0, size);
    const floor = Math.floor(size * 0.8);
    const cut = [window.lastIndexOf('\n\n'), window.lastIndexOf('\n'), window.lastIndexOf('. ')].find((i) => i >= floor);
    const end = cut === undefined ? size : cut + 1;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest.slice(0, size));
  return parts;
}

// The OKF concept type of a link's main page.
export const ROOT_TYPE: Record<SourceKind, string> = { web: 'Web Page', youtube: 'YouTube Video', tweet: 'Social Post', podcast: 'Podcast Episode', pdf: 'Document' };
export const PART_TYPE = 'Source Part';
export const TOPIC_TYPE = 'Topic';
// The OKF actor for a wiki written here: <producer>/<version>.
export const actor = (model: string) => `chronopin-wiki/${model}`;

export const cleanTags = (tags: string[] | undefined) =>
  [...new Set((tags ?? []).map((t) => t.trim().toLowerCase().slice(0, 64)).filter(Boolean))].slice(0, MAX_TAGS);

const toDraft = (page: TopicOut, type: string, children: WikiDraft[] = []): WikiDraft => ({
  type,
  title: page.title.trim(),
  summary: page.summary.trim(),
  body: page.body.trim(),
  tags: cleanTags(page.tags),
  children,
});

const topicsOf = (page: PageOut) => (page.topics ?? []).slice(0, MAX_TOPICS).map((t) => toDraft(t, TOPIC_TYPE));

const isYmd = (value: string | null | undefined): value is string => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

export type WrittenWiki = { root: WikiDraft; generatedBy: string; sourceModifiedDate?: string };

// The page outputs for one link as a wiki tree: one output is the main page
// with its topics; several are parts, with root written from them.
export type WikiOutput = PageOut;
export function wikiFromOutputs(kind: SourceKind, parts: PageOut[], root?: PageOut): Omit<WrittenWiki, 'generatedBy'> {
  if (parts.length === 1 && !root) {
    const [page] = parts;
    return { root: toDraft(page, ROOT_TYPE[kind], topicsOf(page)), sourceModifiedDate: isYmd(page.lastModified) ? page.lastModified : undefined };
  }
  if (!root) throw new Error('a wiki in parts needs a main page');
  const pages = parts.map((part) => toDraft(part, PART_TYPE, topicsOf(part)));
  return { root: toDraft(root, ROOT_TYPE[kind], pages), sourceModifiedDate: isYmd(root.lastModified) ? root.lastModified : undefined };
}

export const wikiHeader = (url: string, kind: SourceKind, title?: string | null) => `Source (${KIND_LABEL[kind]}): ${url}${title ? `\nTitle: ${title}` : ''}`;
export const partContent = (header: string, part: string, i: number, count: number) =>
  `${header}${count > 1 ? `\n\n${PART_NOTE(i + 1, count)}` : ''}\n\n${part}`;
export const rootContent = (header: string, parts: WikiDraft[]) =>
  `${header}\n\n${parts.map((p, i) => `## Part ${i + 1}: ${p.title}\n${p.summary}\n\n${p.body}`).join('\n\n')}`;

export async function writeWiki({ url, kind, title, text }: { url: string; kind: SourceKind; title?: string | null; text: string }): Promise<WrittenWiki | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const header = wikiHeader(url, kind, title);
  const parts = splitText(text);
  const outs = await Promise.all(
    parts.map((part, i) => structured<PageOut>(anthropic, WIKI_PROMPT, pageSchema({ topics: true, root: parts.length === 1 }), partContent(header, part, i, parts.length))),
  );
  if (outs.length === 1) {
    return { ...wikiFromOutputs(kind, [outs[0].data]), generatedBy: actor(outs[0].model) };
  }
  const drafts = outs.map(({ data }) => toDraft(data, PART_TYPE, topicsOf(data)));
  const { data, model } = await structured<PageOut>(anthropic, ROOT_PROMPT, pageSchema({ topics: false, root: true }), rootContent(header, drafts));
  return { ...wikiFromOutputs(kind, outs.map((o) => o.data), data), generatedBy: actor(model) };
}

export type ComposeLink = { label: string; url: string; kind: SourceKind; wiki: WikiPage };
export type ComposePin = { title: string; description?: string | null; utcStartDateTime: Date | string; utcEndDateTime?: Date | string | null; allDay?: boolean };

// A wiki as Markdown for the compose call: every page in full when it fits,
// else sub-pages cut to their one-line summaries.
export function renderWiki(page: WikiPage, full: boolean, depth = 0): string {
  const heading = `${'#'.repeat(Math.min(depth + 3, 6))} ${page.title}`;
  const own = depth === 0 || full ? `${heading}\n${page.summary}\n\n${page.body}` : `- ${page.title}: ${page.summary}`;
  return [own, ...page.children.map((child) => renderWiki(child, full, depth + 1))].join('\n\n');
}

export function composeInput(pin: ComposePin, links: ComposeLink[]): string {
  // All-day pins are UTC days; a timed pin's instant is given in UTC.
  const day = (d: Date | string) => {
    const iso = new Date(d).toISOString();
    return pin.allDay ? iso.slice(0, iso.indexOf('T')) : iso.replace(/:00\.000Z$/, 'Z');
  };
  const header = [
    `Pin: ${pin.title}`,
    pin.description ? `Description: ${pin.description}` : '',
    `Starts: ${day(pin.utcStartDateTime)}${pin.utcEndDateTime ? `, ends: ${day(pin.utcEndDateTime)}` : ''}`,
  ].filter(Boolean);
  const render = (full: boolean) =>
    links.map((l) => `## [${l.label}] ${KIND_LABEL[l.kind]}: ${l.url}\n\n${renderWiki(l.wiki, full)}`).join('\n\n');
  let body = render(true);
  if (body.length > COMPOSE_BUDGET_CHARS) body = render(false).slice(0, COMPOSE_BUDGET_CHARS);
  return `${header.join('\n')}\n\n# Wikis\n\n${body}`;
}

// The summary HTML with its citations written as <cite data-ref> links, or
// undefined when there was too little to summarize.
export async function composeSummary(pin: ComposePin, links: ComposeLink[]): Promise<string | undefined | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  const {
    data: { longFormSummary },
  } = await structured<{ longFormSummary: string | null }>(anthropic, COMPOSE_PROMPT, COMPOSE_SCHEMA, composeInput(pin, links));
  const html = longFormSummary?.trim();
  if (!html) return undefined;
  const byLabel = new Map(links.map((l) => [l.label.toUpperCase(), l.url]));
  return citeLabels(html, (label) => byLabel.get(label.toUpperCase()));
}
