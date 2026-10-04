// Link wikis written elsewhere - a Claude Code session on the dev machine, say -
// and sent to the app instead of being written by its own Anthropic key. They
// arrive keyed by link, the same way a wiki:export job is answered, so prod
// never fetches a page or calls the API: POST /api/admin/source-wikis saves
// them for links that are already pending, and a pin posted through
// POST /api/admin/pins can carry its own as `sourceWikis`.
//
//   { url, kind?, title?, text?, generatedBy?,
//     wiki: <page> | { parts: [<page>, ...], root: <page> } }
//
// A page is what the wiki prompt answers: { title, summary, body, tags,
// lastModified?, topics? } (src/server/extract/wiki.ts). text is the page text
// the wiki was written from; kept when the link has none, so a later recheck
// can tell whether the page changed.

import { sourceKind, type SourceKind } from '@/lib/sourceKind';
import { wikiFromOutputs, type WikiOutput } from '../extract/wiki';
import Source, { PinSource } from '../model/source';
import { MAX_SOURCE_CHARS } from '../scrape/sourceText';
import { HttpError } from '../util/httpError';
import log from '../util/log';
import { syncPinSources } from './sourceWiki';

export const MAX_PREBUILT_WIKIS = 25;
const DEFAULT_ACTOR = 'claude-code/session';
const ACTOR = /^[^\s/:]+\/\S+$|^human:\S+$|^process:\S+$/;

export type PrebuiltWiki = {
  url: string;
  kind?: SourceKind;
  title?: string;
  text?: string;
  generatedBy: string;
  parts: WikiOutput[];
  root?: WikiOutput;
};

export type PrebuiltResult =
  | { url: string; status: 'saved'; sourceId: number; version: number }
  | { url: string; status: 'unchanged' | 'skipped'; message: string }
  | { url: string; status: 'error'; message: string };

export const isWikiPage = (p: unknown): p is WikiOutput => {
  const page = p as WikiOutput;
  return !!page && typeof page.title === 'string' && typeof page.summary === 'string' && typeof page.body === 'string' && Array.isArray(page.tags);
};

const KINDS: SourceKind[] = ['web', 'youtube', 'tweet', 'podcast', 'pdf'];

// Checks the shape of a request's wikis before anything is saved, so a bad
// one fails a pin's post before the pin exists. Throws a 400 naming the entry.
export function parsePrebuiltWikis(input: unknown, label = 'wikis'): PrebuiltWiki[] {
  if (input === undefined || input === null) return [];
  const bad = (i: number, why: string): never => {
    throw new HttpError(400, '', { message: `${label}[${i}]: ${why}` });
  };
  if (!Array.isArray(input)) throw new HttpError(400, '', { message: `${label} must be an array` });
  if (input.length > MAX_PREBUILT_WIKIS) throw new HttpError(400, '', { message: `At most ${MAX_PREBUILT_WIKIS} ${label} per request` });
  return input.map((raw, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad(i, 'expected an object');
    const { url, kind, title, text, generatedBy, wiki } = raw as Record<string, unknown>;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return bad(i, 'url must be an http(s) link');
    if (kind !== undefined && !KINDS.includes(kind as SourceKind)) return bad(i, `kind must be one of ${KINDS.join(', ')}`);
    if (title !== undefined && typeof title !== 'string') return bad(i, 'title must be a string');
    if (text !== undefined && typeof text !== 'string') return bad(i, 'text must be a string');
    const actor = generatedBy === undefined ? DEFAULT_ACTOR : generatedBy;
    if (typeof actor !== 'string' || !ACTOR.test(actor)) return bad(i, 'generatedBy must be an OKF actor, e.g. claude-code/claude-opus-5');
    const single = isWikiPage(wiki);
    const multi = wiki as { parts?: unknown; root?: unknown } | undefined;
    const parts = single ? [wiki] : multi?.parts;
    if (!Array.isArray(parts) || !parts.length || !parts.every(isWikiPage)) {
      return bad(i, 'wiki must be one page { title, summary, body, tags } or { parts: [pages], root: page }');
    }
    if (!single && (parts.length > 1 || multi?.root !== undefined) && !isWikiPage(multi?.root)) return bad(i, 'a wiki in parts needs a root page');
    return {
      url: url.trim(),
      kind: kind as SourceKind | undefined,
      title: title as string | undefined,
      text: text as string | undefined,
      generatedBy: actor,
      parts: parts as WikiOutput[],
      root: single ? undefined : (multi!.root as WikiOutput | undefined),
    };
  });
}

// Saves each wiki on the source already kept for its link. A link whose wiki is
// ready is left alone unless rewrite is set (a rewrite bumps the version, which puts
// every citing pin's summary behind its links again). With pinId, the pin's
// links are synced first and only its own links are taken; the summary it
// carries counts as built from them, so the pin is not rebuilt.
export async function applyPrebuiltWikis(wikis: PrebuiltWiki[], { rewrite = false, pinId }: { rewrite?: boolean; pinId?: number } = {}): Promise<PrebuiltResult[]> {
  if (pinId !== undefined) await syncPinSources(pinId);
  const cited = pinId === undefined ? undefined : new Set((await PinSource.forPin(pinId)).filter((row) => !row.utcRemovedDateTime).map((row) => row.sourceId));
  const results: PrebuiltResult[] = [];
  const taken: { sourceId: number; wikiVersion: number }[] = [];
  for (const item of wikis) {
    try {
      const source = await Source.findByUrl(item.url);
      if (!source) {
        results.push({ url: item.url, status: 'skipped', message: 'no pin cites this link' });
        continue;
      }
      if (cited && !cited.has(source.id)) {
        results.push({ url: item.url, status: 'skipped', message: "not one of the pin's links" });
        continue;
      }
      // Like the pipeline's own ingest: a ready link is done, while a pending one
      // with a wiki is a link whose page changed and is waiting for a rewrite.
      if (source.status === 'ready' && source.wikiVersion > 0 && !rewrite) {
        results.push({ url: item.url, status: 'unchanged', message: `already has wiki version ${source.wikiVersion}` });
        continue;
      }
      const written = wikiFromOutputs(item.kind ?? source.kind ?? sourceKind(item.url), item.parts, item.root);
      if (item.text && (!source.text || rewrite)) {
        await Source.setText(source.id, { text: item.text.slice(0, MAX_SOURCE_CHARS), title: item.title });
      }
      const version = await Source.saveWiki(source.id, written.root, {
        title: item.title ?? source.title ?? written.root.title,
        generatedBy: item.generatedBy,
        sourceModifiedDate: written.sourceModifiedDate,
      });
      taken.push({ sourceId: source.id, wikiVersion: version });
      results.push({ url: item.url, status: 'saved', sourceId: source.id, version });
    } catch (err) {
      log.warn(`prebuilt wiki for ${item.url} failed:`, (err as Error).message);
      results.push({ url: item.url, status: 'error', message: (err as Error).message || 'Failed' });
    }
  }
  if (pinId !== undefined && taken.length) await PinSource.markSummarized(pinId, taken);
  return results;
}
