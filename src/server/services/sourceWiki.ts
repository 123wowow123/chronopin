import * as db from '../db';
import OkfLint from '../model/okfLint';
import { composeSummary, ServiceError, writeWiki, type ComposeLink, type ComposePin } from '../extract/wiki';
import Pin from '../model/pin';
import Source, { hashText, PinSource, type PinSourceRole } from '../model/source';
import { fetchSourceText, type SourceText } from '../scrape/sourceText';
import { sourceKind } from '@/lib/sourceKind';
import log from '../util/log';
import { expirePinPage } from './cache';

// Keeps a pin's long-form summary built from wikis of the links it cites
// (0026_source_wiki.sql):
//
//   1. sync     - one Source per link (sourceUrl + references), PinSource rows in step
//   2. ingest   - each source without a wiki is fetched (unless the scraper
//                 already kept its text) and written up by Claude
//   3. rebuild  - when a link was added or dropped, or a wiki rewritten, the
//                 summary is composed again from the wikis alone
//
// A failure at any step is stored on the source (status, attempts,
// lastError) and picked up again by the next save or `npm run wiki:sync`.

// skipped: no API key, or the API was unavailable; the source stays as it was.
export type IngestResult = 'built' | 'unchanged' | 'skipped' | 'failed';

// One run per pin and per source at a time, in this process: a pin saved
// twice in quick succession, or two pins citing one article, share the work.
const g = globalThis as unknown as { __chronopinWikiRuns?: Map<string, Promise<unknown>> };
const runs = (g.__chronopinWikiRuns ??= new Map());

function exclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = runs.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  runs.set(key, next);
  void next.finally(() => runs.get(key) === next && runs.delete(key)).catch(() => undefined);
  return next;
}

// Step 1. Resolves to false for a pin that is gone.
export async function syncPinSources(pinId: number): Promise<boolean> {
  const links = await PinSource.currentLinks(pinId);
  if (!links) return false;
  // One row per source: a reference repeating the sourceUrl is the source.
  const bySource = new Map<number, PinSourceRole>();
  for (const link of links) {
    const source = await Source.ensure(link.url, sourceKind(link.url));
    if (source && bySource.get(source.id) !== 'source') bySource.set(source.id, link.role);
  }
  const [pin] = await db.query<{ hasSummary: boolean }>(
    `SELECT COALESCE(btrim("longFormSummary"), '') <> '' AS "hasSummary" FROM "Pin" WHERE "id" = $1`,
    [pinId],
  );
  await PinSource.sync(
    pinId,
    [...bySource].map(([sourceId, role]) => ({ sourceId, role })),
    { summaryCoversNew: !!pin?.hasSummary },
  );
  return true;
}

// Step 2, for one source. refetch reads the link again even when its text is
// kept, and rewrites the wiki only if that text changed; fetched hands over
// text a caller has just read, so it is not read twice.
export function ingestSource(
  sourceId: number,
  { refetch = false, fetched: given }: { refetch?: boolean; fetched?: SourceText } = {},
): Promise<IngestResult> {
  return exclusive(`source:${sourceId}`, async () => {
    const source = await Source.getById(sourceId);
    if (!source) return 'skipped';
    if (source.status === 'ready' && !refetch) return 'unchanged';
    let textChanged = false;
    try {
      let { text, title } = source;
      if (!text || refetch) {
        const fetched = given ?? (await fetchSourceText(source.url, source.kind));
        if (refetch && source.wikiVersion > 0 && source.textHash === hashText(fetched.text)) {
          await Source.markUnchanged(sourceId);
          return 'unchanged';
        }
        await Source.setText(sourceId, fetched);
        textChanged = source.wikiVersion > 0;
        text = fetched.text;
        title = title ?? fetched.title ?? null;
      }
      const written = await writeWiki({ url: source.url, kind: source.kind, title, text });
      if (!written) {
        // No API key: stays (or goes back to) pending, no try counted - the
        // stored text has moved on from the wiki, which a later write catches up.
        if (textChanged) await Source.markPending(sourceId);
        return 'skipped';
      }
      await Source.saveWiki(sourceId, written.root, {
        title: title ?? written.root.title,
        generatedBy: written.generatedBy,
        sourceModifiedDate: written.sourceModifiedDate,
      });
      return 'built';
    } catch (err) {
      const message = (err as Error)?.message || String(err);
      log.warn(`wiki for source ${sourceId} (${source.url}) failed:`, message);
      if (err instanceof ServiceError) {
        await Source.noteError(sourceId, message);
        if (textChanged) await Source.markPending(sourceId);
        return 'skipped';
      }
      await Source.markFailed(sourceId, message);
      return 'failed';
    }
  });
}

export type PinLinks = {
  about: ComposePin;
  links: (ComposeLink & { sourceId: number; wikiVersion: number })[];
};

// What a summary (or a contradiction check) is written from: the pin, and each
// link it still cites that has a wiki, labelled S for its source and 1, 2...
// for references. Undefined for a pin that is gone.
export async function pinLinks(pinId: number): Promise<PinLinks | undefined> {
  const { pin } = await Pin.queryById(pinId);
  if (!pin || pin.utcDeletedDateTime) return undefined;
  const rows = (await PinSource.forPin(pinId)).filter((row) => !row.utcRemovedDateTime && row.wikiVersion > 0);
  const wikis = await Source.wikis(rows.map((row) => row.sourceId));
  let n = 0;
  const links: PinLinks['links'] = [];
  for (const row of rows) {
    const wiki = wikis.get(row.sourceId);
    if (!wiki) continue;
    links.push({
      label: row.role === 'source' ? 'S' : String(++n),
      url: row.url,
      kind: row.kind,
      wiki,
      sourceId: row.sourceId,
      wikiVersion: row.wikiVersion,
    });
  }
  const about: ComposePin = {
    title: pin.title,
    description: pin.description,
    utcStartDateTime: pin.utcStartDateTime,
    utcEndDateTime: pin.utcEndDateTime,
    allDay: pin.allDay,
  };
  return { about, links };
}

// Writes a composed summary (HTML already cited by link, or undefined when
// there was too little) and records which wiki versions it took in.
export async function saveSummary(pinId: number, links: PinLinks['links'], summary: string | undefined) {
  if (summary) {
    await Pin.updateLongFormSummary(pinId, summary);
  }
  // Too little to summarize still counts as taken in: the existing summary
  // stays, and the same wikis are not sent again until something changes.
  await PinSource.markSummarized(pinId, links.map(({ sourceId, wikiVersion }) => ({ sourceId, wikiVersion })));
  if (summary) {
    try {
      expirePinPage(pinId);
    } catch {
      // Outside a Next.js server (a script), there is no page cache to expire.
    }
  }
}

// Step 3. Composes the summary from the wikis of every link the pin still
// cites that has one. force rebuilds even when nothing changed. Resolves to
// whether the summary was written.
export async function rebuildSummary(pinId: number, { force = false }: { force?: boolean } = {}): Promise<boolean> {
  if (!force && !(await PinSource.summaryStale(pinId))) return false;
  const found = await pinLinks(pinId);
  if (!found) return false;
  if (!found.links.length) {
    // Nothing to write from; the dropped links still come off.
    await PinSource.markSummarized(pinId, []);
    return false;
  }
  const summary = await composeSummary(found.about, found.links);
  if (summary === null) return false; // no API key
  await saveSummary(pinId, found.links, summary);
  return !!summary;
}

export type RefreshOptions = {
  // Rebuild the summary even when its links have not changed.
  rebuild?: boolean;
  // Retry sources that are out of tries too.
  retryFailed?: boolean;
  // Fetch these sources again (all of the pin's, when true).
  refetch?: boolean | number[];
};

// Steps 1-3 for one pin: what a save runs, and what the catch-up job and the
// admin API run on demand.
export function refreshPin(pinId: number, options: RefreshOptions = {}) {
  return exclusive(`pin:${pinId}`, async () => {
    if (!(await syncPinSources(pinId))) return { pinId, ingested: {}, rebuilt: false };
    const refetchIds =
      options.refetch === true
        ? (await PinSource.forPin(pinId)).filter((row) => !row.utcRemovedDateTime).map((row) => row.sourceId)
        : options.refetch || [];
    const needing = await Source.needingWiki({ pinId, force: options.retryFailed });
    const ids = [...new Set([...needing, ...refetchIds])];
    const results = await Promise.all(ids.map((id) => ingestSource(id, { refetch: refetchIds.includes(id) })));
    const ingested = Object.fromEntries(ids.map((id, i) => [id, results[i]]));
    let rebuilt = false;
    try {
      rebuilt = await rebuildSummary(pinId, { force: options.rebuild });
    } catch (err) {
      // Left stale; the next save or wiki:sync tries again.
      log.warn(`summary rebuild for pin ${pinId} failed:`, (err as Error)?.message || err);
    }
    return { pinId, ingested, rebuilt };
  });
}

// Everything the admin source view shows for a pin: each link, its status,
// and its wiki. Undefined for a pin that does not exist.
export async function pinSourceView(pinId: number) {
  const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [pinId]);
  if (!pin) return undefined;
  const rows = await PinSource.forPin(pinId);
  const wikis = await Source.wikis(rows.map((row) => row.sourceId));
  return {
    pinId,
    summaryStale: await PinSource.summaryStale(pinId),
    lintFindings: await OkfLint.forPin(pinId),
    sources: rows.map((row) => ({
      id: row.sourceId,
      url: row.url,
      kind: row.kind,
      role: row.role,
      title: row.title,
      status: row.status,
      attempts: row.attempts,
      lastError: row.lastError,
      wikiVersion: row.wikiVersion,
      summarizedWikiVersion: row.summarizedWikiVersion,
      removed: !!row.utcRemovedDateTime,
      utcBuiltDateTime: row.utcBuiltDateTime,
      wiki: wikis.get(row.sourceId) ?? null,
    })),
  };
}
