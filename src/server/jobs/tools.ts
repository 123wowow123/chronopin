// The tools a daily job's model works with, one list for both drivers: the
// API driver hands them to the Messages API (./drivers/api.ts), the session
// driver serves them to a headless Claude Code over MCP
// (scripts/jobs/mcp.ts). docs/okf/scraping/daily-jobs.md#tools says which
// is for what.
//
// Only what Claude cannot do natively is a tool. Web search, reading a page
// or a PDF, and looking at a picture are the model's own (web_search and
// web_fetch on the API, WebSearch and WebFetch in Claude Code). What is here
// is the app's data, the app's writes, and the parts of the scrape pipeline
// the model has no equivalent of: a headless Chrome for pages a plain fetch
// cannot read, the whole scrape (media top-up, screen extras, metadata), and
// the image processor that says whether a picture repeats one a pin has.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { mediumID } from '@/lib/appConfig';
import { CATEGORIES } from '@/lib/categories';
import * as db from '../db';
import { inspectImage } from '../image';
import { hashDistance, NEAR_DUPLICATE_DISTANCE } from '../imageHash';
import JobRun from '../model/jobRun';
import Medium, { imageHashOf } from '../model/medium';
import PinRevisit from '../model/pinRevisit';
import PinSentiment, { sentimentHash } from '../model/pinSentiment';
import Comment from '../model/comment';
import { clampSentiment, PIN_SENTIMENT_PROMPT } from '../extract/pinSentiment';
import { COMMENT_SENTIMENT_PROMPT } from '../extract/sentiment';
import { invalidateTimeline } from '../services/cache';
import { fetchSourceText } from '../scrape/sourceText';
import { CURATORS } from './curators';
import { checkPinHealth, pinsToCheck } from './health';
import { createPin, getPin, scrapeUrl, updatePin, type PinPatch } from './pinApi';
import * as signals from './signals';
import { trendCandidates } from './trends';

export type JobContext = {
  runId: number;
  jobId: string;
  maxNewPins: number;
  maxUpdates: number;
  created: number;
  updated: number;
  // When this job last finished a run, for "since the last run".
  since: Date | null;
};

type Schema = { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };

export type JobTool = {
  name: string;
  description: string;
  input_schema: Schema;
  run: (input: Record<string, any>, ctx: JobContext) => Promise<unknown>;
};

// A tool result the model can read in one go.
export const MAX_RESULT_CHARS = 40000;
const PAGE_CHARS = 30000;

export const OKF_ROOT = path.join(process.cwd(), 'docs', 'okf');

const int = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const str = (description: string) => ({ type: 'string', description });
const num = (description: string) => ({ type: 'integer', description });
const obj = (properties: Record<string, unknown> = {}, required: string[] = []): Schema => ({ type: 'object', properties, required, additionalProperties: false });

async function act(ctx: JobContext, action: { tool: string; pinId?: number; title?: string; detail: string }) {
  await JobRun.addAction(ctx.runId, { at: new Date().toISOString(), ...action });
}

// The OKF page at a path under docs/okf, or its sections that mention
// `search`. Nothing outside the folder is readable.
export async function readOkf(relative: string, search?: string, offset = 0) {
  const file = path.resolve(OKF_ROOT, relative.replace(/^docs\/okf\//, ''));
  if (!file.startsWith(OKF_ROOT + path.sep) || !file.endsWith('.md')) throw new Error('Only .md pages under docs/okf can be read');
  const text = await readFile(file, 'utf8');
  if (search) {
    const needle = search.toLowerCase();
    const sections = text.split(/\n(?=#{1,3} )/).filter((s) => s.toLowerCase().includes(needle));
    return { path: relative, matchingSections: sections.length, text: sections.join('\n\n').slice(0, PAGE_CHARS) };
  }
  return { path: relative, length: text.length, offset, text: text.slice(offset, offset + PAGE_CHARS) };
}

export const TOOLS: JobTool[] = [
  // --- What the app knows -------------------------------------------------
  {
    name: 'category_coverage',
    description: `Every category's live pins: in total, ahead of today, in the next 90 and 365 days, thinnest future first. A category with a past and no future is the one that needs pins. The fixed category list is: ${CATEGORIES.join(', ')}.`,
    input_schema: obj(),
    run: () => signals.categoryCoverage(),
  },
  {
    name: 'trending_categories',
    description: 'Pin-page opens per category over the last `days` (default 7) against the days before, most opened first, with each one\'s future pin count.',
    input_schema: obj({ days: num('Window in days, 1-60') }),
    run: (input) => signals.trendingCategories(int(input.days, 7, 1, 60)),
  },
  {
    name: 'most_viewed_pins',
    description: 'The most opened pins of the last `days` (default 7): what readers are looking at inside the trending categories.',
    input_schema: obj({ days: num('Window in days, 1-60') }),
    run: (input) => signals.mostViewedPins(int(input.days, 7, 1, 60)),
  },
  {
    name: 'google_trends',
    description:
      "Google Trends' daily trending searches across geographies, scored for whether the news behind each term points at a dated event, with coveredByPin when a pin already has it. About 3% of terms are pinnable events; most are same-day sport, lotteries or names. Set includeNoise to see everything.",
    input_schema: obj({ geos: { type: 'array', items: { type: 'string' }, description: 'Two-letter country codes; default ten large markets' }, includeNoise: { type: 'boolean' } }),
    run: async (input) => {
      const { total, candidates } = await trendCandidates({ geos: Array.isArray(input.geos) && input.geos.length ? input.geos.slice(0, 15) : undefined, all: !!input.includeNoise });
      return { termsRead: total, candidates: candidates.slice(0, 40).map((c) => ({ ...c, news: c.news.slice(0, 3) })) };
    },
  },
  {
    name: 'revisit_queue',
    description: 'Pins marked for revisiting (by an admin or an earlier run), oldest mark first, with why. Resolve each one you finish with resolve_revisit.',
    input_schema: obj({ limit: num('At most this many, default 25') }),
    run: (input) => PinRevisit.listOpen(int(input.limit, 25, 1, 100)),
  },
  {
    name: 'soft_dated_soon',
    description: "Pins in the next `days` (default 30) whose date is still 'estimated', 'unknown' or 'delayed': the ones most likely to have firmed up.",
    input_schema: obj({ days: num('Horizon in days, default 30') }),
    run: (input) => signals.softDatedSoon(int(input.days, 30, 1, 365)),
  },
  {
    name: 'pins_this_week',
    description: 'Pins happening from yesterday to a week out, least vetted first: date confidence, reference and media counts, whether it has a place, when it last changed, and its author.',
    input_schema: obj(),
    run: () => signals.pinsThisWeek(),
  },
  {
    name: 'pins_changed_since_last_run',
    description: "Pins created or edited since this job's last completed run (or the last 24 hours before its first).",
    input_schema: obj(),
    run: (_input, ctx) => signals.pinsChangedSince(ctx.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000)),
  },
  {
    name: 'recent_comments',
    description: 'Comments from the last `days` (default 14), newest first, with the pin each is on and its sentiment (-1 to 1). Find the subjects people keep raising.',
    input_schema: obj({ days: num('Window in days, default 14') }),
    run: (input) => signals.recentComments(int(input.days, 14, 1, 90)),
  },
  {
    name: 'active_user_places',
    description:
      "Where the active users are (signed-in people who opened or commented on pins in the last `days`), grouped by their saved default location, with how many pins already sit within `radiusKm` over the next 60 days. Users with no saved location are only counted - never guess their place.",
    input_schema: obj({ days: num('Activity window, default 30'), radiusKm: num('Radius for nearby pins, default 50') }),
    run: (input) => signals.activeUserPlaces(int(input.days, 30, 1, 180), int(input.radiusKm, 50, 5, 500)),
  },
  // --- Beats (fortune100, layoffs) -----------------------------------------
  {
    name: 'company_coverage',
    description:
      "How well each named company is already covered: its matching Company rows, its live pins in total, ahead of today and in the next 90 days, when one was last posted, and the tags most of its pins share (use its shared tag on new pins). Stalest first - never pinned, then longest since a post - so pass the whole Fortune 100 list and work down from the top. A name matches a company named the same or starting with it (\"Abbott\" finds \"Abbott Laboratories\"); an empty `companies` means none matched, so check the name the app uses (find_pins) before treating it as uncovered.",
    input_schema: obj({ names: { type: 'array', items: { type: 'string' }, description: 'Company names, up to 150' } }, ['names']),
    run: (input) => signals.companyCoverage(Array.isArray(input.names) ? input.names.map(String) : []),
  },
  {
    name: 'tagged_pins',
    description:
      "The live pins carrying a tag (any case), newest event first, with company, source, parent and author, plus how many there are in all and ahead of today: what a standing beat (tag 'Layoffs') has already pinned, so a run adds only what is missing and threads a follow-up onto the pin it continues.",
    input_schema: obj({ tag: str('The tag, e.g. Layoffs'), limit: num('At most this many, default 40') }, ['tag']),
    run: (input) => signals.taggedPins(String(input.tag), int(input.limit, 40, 1, 100)),
  },
  // --- Sentiment (the sentiment task) -------------------------------------
  {
    name: 'pending_sentiment',
    description:
      "The company pins whose title or summary changed since their tone was scored, or that were never scored, and the comments with no tone yet - with the rubric for each. Score each from -1 to 1 by its rubric and save them with record_sentiment, then ask again until nothing is left.",
    input_schema: obj({ limit: num('At most this many of each, default 50, at most 200') }),
    run: async (input) => {
      const limit = int(input.limit, 50, 1, 200);
      const [pins, commentIds] = await Promise.all([PinSentiment.unscored(100_000), Comment.unscoredIds(100_000)]);
      const comments = (await Promise.all(commentIds.slice(0, limit).map(async (id) => ({ id, context: await Comment.sentimentContext(id) }))))
        .filter((c) => c.context)
        .map(({ id, context }) => ({ id, pin: context!.pinTitle, replyingTo: context!.parentText ?? undefined, text: context!.text }));
      return {
        pinRubric: PIN_SENTIMENT_PROMPT,
        commentRubric: COMMENT_SENTIMENT_PROMPT,
        pins: pins.slice(0, limit).map((p) => ({ id: p.id, company: p.company, title: p.title, summary: p.description ?? '', textHash: sentimentHash(p) })),
        comments,
        remaining: { pins: Math.max(0, pins.length - limit), comments: Math.max(0, commentIds.length - limit) },
      };
    },
  },
  {
    name: 'record_sentiment',
    description:
      'Saves tones from pending_sentiment: pins as { id, sentiment, textHash } (textHash exactly as given) and comments as { id, sentiment, text } (text exactly as given). A pin or comment edited since it was handed out is skipped, to be scored again.',
    input_schema: obj({
      pins: { type: 'array', items: obj({ id: num('Pin id'), sentiment: { type: 'number', description: '-1 to 1' }, textHash: str('As given') }, ['id', 'sentiment', 'textHash']) },
      comments: { type: 'array', items: obj({ id: num('Comment id'), sentiment: { type: 'number', description: '-1 to 1' }, text: str('As given') }, ['id', 'sentiment', 'text']) },
    }),
    run: async (input, ctx) => {
      const score = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? clampSentiment(value) : null);
      let pins = 0;
      let comments = 0;
      let skipped = 0;
      for (const p of Array.isArray(input.pins) ? input.pins : []) {
        const value = score(p?.sentiment);
        if (value != null && (await PinSentiment.setIfUnchanged(int(p.id, 0, 1, 2 ** 31 - 1), String(p.textHash ?? ''), value))) pins++;
        else skipped++;
      }
      for (const c of Array.isArray(input.comments) ? input.comments : []) {
        const value = score(c?.sentiment);
        if (value != null && (await Comment.setSentiment(int(c.id, 0, 1, 2 ** 31 - 1), String(c.text ?? ''), value))) comments++;
        else skipped++;
      }
      if (pins || comments) {
        await act(ctx, { tool: 'record_sentiment', detail: `scored ${pins} pin(s) and ${comments} comment(s)${skipped ? `, ${skipped} skipped` : ''}` });
        // The company graphs ride in the cached search results.
        try {
          invalidateTimeline();
        } catch {
          // Outside a request the cache is not ours to expire; it lapses in minutes.
        }
      }
      return { pins, comments, skipped };
    },
  },
  {
    name: 'find_pins',
    description:
      'The already-pinned test: live pins whose title has every word of `text` (whole words, punctuation ignored) or whose source is exactly `sourceUrl`, optionally within `windowDays` of the ISO date `around`. Run it before creating any pin.',
    input_schema: obj({ text: str('Words of the title'), sourceUrl: str('Exact source URL'), around: str('ISO date'), windowDays: num('Days either side, default 30') }),
    run: (input) => signals.findPins({ text: input.text, sourceUrl: input.sourceUrl, around: input.around, windowDays: int(input.windowDays, 30, 1, 3650) }),
  },
  {
    name: 'get_pin',
    description: "One pin's full JSON as the API serves it: fields, media, references, tags, categories, author.",
    input_schema: obj({ pinId: num('Pin id') }, ['pinId']),
    run: (input) => getPin(int(input.pinId, 0, 1, 2 ** 31 - 1)),
  },
  {
    name: 'pin_health_scan',
    description:
      "Checks up to `limit` (default 25) of the pins most worth checking (this week's, the next month's, the most opened) and returns only those with problems: a picture that 404s or is no longer an image, a removed or unembeddable YouTube video, a deleted X post, a dead source. 'blocked' (403/429) is not broken - leave those.",
    input_schema: obj({ limit: num('Pins to check, default 25, at most 60') }),
    run: async (input) => {
      const ids = await pinsToCheck(int(input.limit, 25, 1, 60));
      const found = [];
      for (const { id } of ids) {
        const health = await checkPinHealth(id);
        if (health?.problems.length) found.push(health);
      }
      return { checked: ids.length, withProblems: found };
    },
  },
  {
    name: 'check_pin_health',
    description: "One pin's media, source and (with references: true) reference links, each as ok or with its problem.",
    input_schema: obj({ pinId: num('Pin id'), references: { type: 'boolean' } }, ['pinId']),
    run: (input) => checkPinHealth(int(input.pinId, 0, 1, 2 ** 31 - 1), { references: !!input.references }),
  },
  {
    name: 'read_okf',
    description:
      "Reads a page of the Open Knowledge Format docs (docs/okf), the strategy these jobs follow: e.g. scraping/strategy.md, scraping/fields.md, scraping/enrichment.md, scraping/sources.md, scraping/verticals.md, scraping/learnings.md (long - pass `search` to get only the sections that mention a word). `offset` pages through a long file.",
    input_schema: obj({ path: str('Path under docs/okf'), search: str('Only sections mentioning this'), offset: num('Character offset') }, ['path']),
    run: (input) => readOkf(String(input.path), input.search ? String(input.search) : undefined, int(input.offset, 0, 0, 10_000_000)),
  },

  // --- What Claude cannot do natively ------------------------------------
  {
    name: 'read_page',
    description:
      "A page's text as a real browser sees it: a headless Chrome render when a plain fetch is blocked or the page builds itself with JavaScript, a YouTube video's transcript, a podcast episode's transcript, an X post's text, a scanned PDF's OCR. Use it when your own web fetch fails or comes back empty. `offset` pages through long text.",
    input_schema: obj({ url: str('http(s) URL'), offset: num('Character offset') }, ['url']),
    run: async (input) => {
      const found = await fetchSourceText(String(input.url));
      const offset = int(input.offset, 0, 0, found.text.length);
      return { title: found.title, length: found.text.length, offset, text: found.text.slice(offset, offset + PAGE_CHARS) };
    },
  },
  {
    name: 'scrape_url',
    description:
      "The app's whole scrape of a URL into a draft pin: headless Chrome, the page's own metadata (Open Graph, JSON-LD), its pictures and embedded videos, picture and video top-up, trailer and ratings for screen media, studio HQ, and the field extraction. When the app's own API key has no credit, the draft carries `llmTasks` (extract, references) for you to answer yourself - merge your answers over the draft. Review the draft against the quality bar before create_pin.",
    input_schema: obj({ url: str('The source URL'), curator: str('The curator the pin would be posted as'), note: str('What the pin is about, when the page covers more than one event') }, ['url', 'curator']),
    run: async (input) => {
      const draft = await scrapeUrl(String(input.url), String(input.curator), input.note ? String(input.note) : undefined);
      // The tasks carry the app's own prompts and up to 60,000 characters of
      // page text, which would crowd the draft out of one tool result. The
      // model reads the page itself and has the field rules
      // (scraping/fields.md), so each task keeps only what it is and, for
      // the extraction, the schema its answer fills.
      if (Array.isArray(draft.llmTasks)) {
        draft.llmTasks = draft.llmTasks.map((task: { stage: string; schema?: unknown }) =>
          task.stage === 'extract'
            ? { stage: 'extract', todo: 'Read the page and fill these fields yourself (rules: read_okf scraping/fields.md); merge them over the draft.', schema: task.schema }
            : { stage: task.stage, todo: 'Find up to 5 independent references at confidence 70+ and write the cited longFormSummary (rules: read_okf scraping/enrichment.md).' },
        );
      }
      return draft;
    },
  },
  {
    name: 'check_image',
    description:
      "Downloads and decodes a picture: its size, type and fingerprint, and - with pinId - whether it is a near-duplicate of a picture that pin already has (the same image at another size or from another CDN). Use before adding a picture; skip anything under about 400px wide or that repeats one the pin has.",
    input_schema: obj({ url: str('Picture URL'), pinId: num('Compare with this pin\'s pictures') }, ['url']),
    run: async (input) => {
      const found = await inspectImage(String(input.url));
      if (!input.pinId) return found;
      const rows = await db.query(
        `SELECT "m".* FROM "PinMedium" AS "pm" JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId" WHERE "pm"."pinId" = $1 AND "pm"."utcDeletedDateTime" IS NULL AND "m"."type" = $2`,
        [input.pinId, String(mediumID.image)],
      );
      const repeats = [];
      for (const row of rows) {
        const hash = await imageHashOf(new Medium(row));
        if (hash && hashDistance(hash, found.hash) <= NEAR_DUPLICATE_DISTANCE) repeats.push({ mediumId: row.id, originalUrl: row.originalUrl });
      }
      return { ...found, repeatsPictureOnPin: repeats };
    },
  },

  // --- Writes ----------------------------------------------------------
  {
    name: 'create_pin',
    description: `Posts a new pin through the real API as a curator: ${Object.entries(CURATORS)
      .map(([h, v]) => `${h} (${v})`)
      .join('; ')}. \`pin\` is the POST /api/pins body: title, description, sourceUrl, utcStartDateTime, utcEndDateTime, allDay, dateConfidence, dateConfidenceReasoning, address, latitude, longitude, price, priceCurrency, company, companyWikiUrl, categories (from the fixed list), tags, media [{type: 1 picture | 3 YouTube, originalUrl}], references [{url, title, confidence, publishedDate, reasoning}], longFormSummary (HTML list, each point cited), stocks, parentId. Run find_pins first; the route also rejects a source URL already pinned.`,
    input_schema: obj({ curator: str('Curator handle, e.g. @TechDesk'), pin: { type: 'object', description: 'The pin body' }, why: str('One line: why this event is worth a pin now') }, ['curator', 'pin', 'why']),
    run: async (input, ctx) => {
      const pin = (input.pin ?? {}) as Record<string, unknown>;
      if (!pin.title || !pin.utcStartDateTime || !pin.sourceUrl) throw new Error('pin needs at least title, utcStartDateTime and sourceUrl');
      if (ctx.created >= ctx.maxNewPins) throw new Error(`This run's limit of ${ctx.maxNewPins} new pins is reached; report the rest as candidates instead.`);
      // Counted before the first await, so calls made in parallel cannot
      // overshoot the limit, and given back if nothing is created.
      ctx.created++;
      try {
        const existing = await signals.findPins({ sourceUrl: String(pin.sourceUrl) });
        if (existing.length) throw new Error(`Already pinned: ${existing.map((p) => `#${p.id} ${p.title}`).join('; ')}. Add it as a reference there instead.`);
        const saved = await createPin(String(input.curator), pin);
        await act(ctx, { tool: 'create_pin', pinId: saved.id, title: saved.title, detail: `${input.curator}: ${input.why}` });
        return { created: saved.id, title: saved.title };
      } catch (err) {
        ctx.created--;
        throw err;
      }
    },
  },
  {
    name: 'update_pin',
    description:
      "Edits a pin a curator posted, through the real API as that curator. `patch` holds only the fields that change, plus the helpers addReferences [{url, title, confidence, publishedDate, reasoning}], addMedia [{type, originalUrl}] and removeMediumIds [ids]; everything else is kept. A pin by anyone who is not a curator cannot be edited here - mark it for revisiting with what should change.",
    input_schema: obj({ pinId: num('Pin id'), patch: { type: 'object', description: 'Changed fields and helpers' }, reason: str('What changed and on what evidence') }, ['pinId', 'patch', 'reason']),
    run: async (input, ctx) => {
      const pinId = int(input.pinId, 0, 1, 2 ** 31 - 1);
      if (ctx.updated >= ctx.maxUpdates) throw new Error(`This run's limit of ${ctx.maxUpdates} updates is reached; mark the rest for revisiting.`);
      const patch = (input.patch ?? {}) as PinPatch;
      ctx.updated++;
      const saved = await updatePin(pinId, patch).catch((err) => {
        ctx.updated--;
        throw err;
      });
      await act(ctx, { tool: 'update_pin', pinId, title: saved.title, detail: `${input.reason} [${Object.keys(patch).join(', ')}]` });
      return { updated: pinId, title: saved.title };
    },
  },
  {
    name: 'mark_revisit',
    description: "Marks a pin to be looked at again, with what needs doing: something you could not fix now, a pin you may not edit, a date that should firm up later. The midnight job works these.",
    input_schema: obj({ pinId: num('Pin id'), reason: str('What needs doing and why') }, ['pinId', 'reason']),
    run: async (input, ctx) => {
      const pinId = int(input.pinId, 0, 1, 2 ** 31 - 1);
      const marked = await PinRevisit.mark(pinId, String(input.reason), { jobRunId: ctx.runId });
      await act(ctx, { tool: 'mark_revisit', pinId, detail: String(input.reason) });
      return { marked };
    },
  },
  {
    name: 'resolve_revisit',
    description: "Closes a pin's open revisit mark with what was done (or why nothing needed doing).",
    input_schema: obj({ pinId: num('Pin id'), resolution: str('What was done') }, ['pinId', 'resolution']),
    run: async (input, ctx) => {
      const pinId = int(input.pinId, 0, 1, 2 ** 31 - 1);
      const resolved = await PinRevisit.resolve(pinId, String(input.resolution), ctx.runId);
      if (resolved) await act(ctx, { tool: 'resolve_revisit', pinId, detail: String(input.resolution) });
      return { resolved };
    },
  },
  {
    name: 'record_learning',
    description:
      'Records something this run taught that should change how the next runs work: a source that blocks, a rule that misfired, a category that turned out to have no future to pin. The newest are read back into every run\'s instructions and added to the OKF learnings log.',
    input_schema: obj({ topic: str('A few words: the source, task or rule'), text: str('What was learned, concretely, and what to do differently') }, ['topic', 'text']),
    run: async (input, ctx) => {
      await JobRun.addLearning(ctx.runId, { at: new Date().toISOString(), topic: String(input.topic).slice(0, 120), text: String(input.text).slice(0, 2000) });
      return { recorded: true };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// Runs a tool by name and gives back the text the model reads: the result as
// JSON, cut to MAX_RESULT_CHARS, or the error as a message it can act on.
export async function runTool(name: string, input: Record<string, any>, ctx: JobContext): Promise<{ text: string; isError: boolean }> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) return { text: `No tool named ${name}`, isError: true };
  try {
    const result = await tool.run(input ?? {}, ctx);
    const text = JSON.stringify(result ?? null);
    return { text: text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}... [cut at ${MAX_RESULT_CHARS} characters]` : text, isError: false };
  } catch (err) {
    return { text: (err as Error)?.message || String(err), isError: true };
  }
}

// The run's context from its row, so a second process (the MCP server)
// counts what the run has already written against the same limits.
export async function contextForRun(runId: number, job: { maxNewPins: number; maxUpdates: number }): Promise<JobContext> {
  const run = await JobRun.get(runId);
  if (!run) throw new Error(`No job run ${runId}`);
  const count = (tool: string) => run.actions.filter((a) => a.tool === tool).length;
  return {
    runId,
    jobId: run.jobId,
    maxNewPins: job.maxNewPins,
    maxUpdates: job.maxUpdates,
    created: count('create_pin'),
    updated: count('update_pin'),
    since: await JobRun.lastFinished(run.jobId),
  };
}

// Whether the OKF docs are on this machine (a production image copies them).
export async function okfAvailable(): Promise<boolean> {
  return stat(OKF_ROOT).then((s) => s.isDirectory(), () => false);
}
