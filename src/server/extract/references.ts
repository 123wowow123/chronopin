/**
 * Further references for a scraped pin: pages elsewhere on the web that back
 * up the event the source describes, found with Claude's web search.
 *
 * Its own call, run alongside extractPinFields rather than inside it:
 * searching takes several round trips, and the extractor's structured output
 * cannot be combined with the citations web search produces. The model hands
 * its picks back through a strict record_references tool instead.
 *
 * A URL only survives if it came back in a search or fetch result during the
 * call - never one the model typed from memory - and only references rated
 * MIN_CONFIDENCE or higher are kept.
 *
 * The same call writes the pin's long-form summary, since it has the source
 * and every page it found in hand: each point cites what backs it, and those
 * citations are stored by link (see numberCitations in src/lib/citations.ts).
 */

import type Anthropic from '@anthropic-ai/sdk';
import { citeTag, urlKey } from '@/lib/citations';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

export const MIN_CONFIDENCE = 70;
const MAX_REFERENCES = 5;
const MAX_SEARCHES = 5;
// A pause_turn hands the server's search loop back to us; resume at most this often.
const MAX_CONTINUATIONS = 3;
// The page only has to say what the event is; the search does the rest.
export const MAX_PAGE_CHARS = 20000;
// The scrape route has 120s in all, and the browser has already used some.
const TIMEOUT_MS = 90000;

export type FoundReference = {
  url: string;
  title?: string;
  confidence: number;
  publishedDate?: string;
  startDate?: string;
  endDate?: string;
  reasoning?: string;
};

const SYSTEM_PROMPT = `You find corroborating references for an event pin. You are given the source the pin was made from: a web page's text, a YouTube video's title and description, or a tweet. Work out the single event it is about - what happens, who does it, and when - then search the web for other pages that independently back up that event and its date. When the source alone is too thin to tell, fetch the articles it links to first.

Prefer, in order: the organization's own announcement or press release, official filings or government pages, and established news outlets or trade press reporting it directly. Skip the source itself (and other copies of it), aggregators, forums, social posts, SEO content farms, and pages that only mention the event in passing.

Video descriptions and tweets often point at where their facts come from - a "full story" article, credited news agencies, architects or companies. Follow those leads, but sponsor, affiliate, merch, podcast, newsletter, shortened promo and social-profile links are never references themselves.

Rate each reference's confidence, 0-100, by how strongly the page itself supports the event happening on that date:
- 90-100: an official or primary source stating the event and date as firm.
- 75-89: reliable independent reporting that gives the same date as scheduled or confirmed.
- 50-74: the event is covered but the date is an estimate, a window, or differs.
- below 50: weak, indirect, or contradicting.

Then weigh the site itself: the lower its standing, the lower the confidence, whatever the page claims. A little-known blog, a small or hobbyist site, a thin rewrite of other coverage, or a site with no clear editorial record sits at least 15 points below what the same wording would earn from an established outlet, and never above 74. Say in the reasoning when the site's standing pulled the confidence down.

Only record references rated ${MIN_CONFIDENCE} or higher, at most ${MAX_REFERENCES}, strongest first. Copy each URL exactly as it appeared in a search or fetch result - never write one from memory or adjust it. publishedDate is the page's own publication date as YYYY-MM-DD, from the result's page age or the page itself, or null when unknown. startDate and endDate are when that page says the event starts and ends, as YYYY-MM-DD (endDate is the last day, inclusive), each null when the page does not give a specific day - never carry a date over from the source or from another page. reasoning is one or two sentences on why that confidence, grounded in what the page itself says about the event and its date - quote its key phrase where you can, and name the site ("LTA's project page says Phase 1 opens in 2030"). When nothing qualifies, record an empty list.

Also write longFormSummary: the event's key points as an HTML bulleted list, "<ul><li>...</li></ul>" - real list markup, not prose and not markdown - drawn from the source and from the references you record. Where a reference adds to or updates the source (a newer date, a cost, who is involved), include that. Ground every point: end it with a citation of each page that backs it, [S] for the source and [1], [2]... for references by their position in the list you record, e.g. "<li>Opens to traffic on 18 September 2026 [S][2]</li>". Cite only what a page actually says, and never a page you are not recording. longFormSummary is null when there is too little to summarize.

Finish by calling record_references exactly once.`;

const RECORD_TOOL: Anthropic.Beta.BetaTool = {
  name: 'record_references',
  description: 'Records the corroborating references found for the pin, and its cited summary. Call once, after searching, with every qualifying reference.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      references: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The page URL exactly as returned by web search or web fetch.' },
            title: { type: 'string', description: "The page's own title." },
            confidence: { type: 'integer', description: "How strongly this page supports the event and its date, 0-100, lowered for a low-standing site." },
            publishedDate: { type: ['string', 'null'], description: 'Publication date as YYYY-MM-DD, or null when unknown.' },
            startDate: { type: ['string', 'null'], description: 'The day this page says the event starts, as YYYY-MM-DD, or null when it gives none.' },
            endDate: { type: ['string', 'null'], description: 'The last day this page says the event runs, as YYYY-MM-DD, or null when it gives none.' },
            reasoning: { type: 'string', description: 'Why this confidence: what the page itself says about the event and its date, in one or two sentences.' },
          },
          required: ['url', 'title', 'confidence', 'publishedDate', 'startDate', 'endDate', 'reasoning'],
          additionalProperties: false,
        },
      },
      longFormSummary: {
        type: ['string', 'null'],
        description: 'Key points as an HTML bulleted list, each ending with its citations: [S] for the source, [n] for the nth recorded reference. Null when there is too little to summarize.',
      },
    },
    required: ['references', 'longFormSummary'],
    additionalProperties: false,
  },
};

// The reference search as a task a Claude Code session can answer when the API
// is unavailable: the same system prompt, record schema and user message. The
// session searches and fetches itself, and may keep only URLs it actually
// fetched (see references:apply).
export function referencesTask(sourceUrl: string, sourceText: string, kind: SourceKind = 'web page') {
  return {
    stage: 'references' as const,
    system: SYSTEM_PROMPT,
    schema: RECORD_TOOL.input_schema,
    input: `Source (${kind}): ${sourceUrl}\n\n${(sourceText || '').trim().slice(0, MAX_PAGE_CHARS)}`,
  };
}

export type FoundReferences = {
  references: FoundReference[];
  // Summary HTML whose citations are <cite data-ref> tags, or undefined.
  longFormSummary?: string;
};

const NONE: FoundReferences = { references: [] };

export type SourceKind = 'web page' | 'YouTube video' | 'tweet';

// Below this much text there is nothing to search from. A tweet is short by
// nature; a web page that short is a script shell that did not render.
const MIN_TEXT_CHARS: Record<SourceKind, number> = { 'web page': 200, 'YouTube video': 40, tweet: 20 };

/**
 * Resolves to the references worth adding and the cited summary, or to no
 * references and no summary when there is no API key, too little text, or the
 * search failed - they are a bonus, so their absence never breaks a scrape.
 */
export async function findReferences(sourceUrl: string, sourceText: string, kind: SourceKind = 'web page'): Promise<FoundReferences> {
  const anthropic = getClient();
  if (!anthropic) return NONE;

  const text = (sourceText || '').trim();
  if (text.length < MIN_TEXT_CHARS[kind]) return NONE;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: `Source (${kind}): ${sourceUrl}\n\n${text.slice(0, MAX_PAGE_CHARS)}` },
  ];
  const seen = new Set<string>();

  try {
    for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
      const response = await anthropic.beta.messages.create(
        {
          model: MODEL,
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: SYSTEM_PROMPT,
          tools: [
            { type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES },
            { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: MAX_SEARCHES },
            RECORD_TOOL,
          ],
          messages,
        },
        { timeout: TIMEOUT_MS, maxRetries: 0 },
      );

      response.content.forEach((block) => collectResultUrls(block, seen));

      if (response.stop_reason === 'refusal') {
        log.warn('references refused', log.stringify(response.stop_details));
        return NONE;
      }
      const record = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === RECORD_TOOL.name,
      );
      if (record) {
        const input = record.input as { references?: FoundReference[]; longFormSummary?: string | null };
        const candidates = input.references || [];
        const references = keepReferences(candidates, seen, sourceUrl);
        return { references, longFormSummary: citeSummary(input.longFormSummary, candidates, references, sourceUrl) };
      }
      if (response.stop_reason !== 'pause_turn') {
        log.warn('references ended without a record', response.stop_reason);
        return NONE;
      }
      // The server paused its search loop; sending the turn back resumes it.
      messages.push({ role: 'assistant', content: response.content });
    }
    log.warn('references still searching after', MAX_CONTINUATIONS, 'continuations');
    return NONE;
  } catch (err) {
    log.warn('references failed', describeError(err));
    return NONE;
  }
}

// Every URL a search or fetch result handed back, however deep in the block
// (dynamic filtering can wrap results in code execution output).
function collectResultUrls(block: Anthropic.Beta.BetaContentBlock, seen: Set<string>) {
  if (!block.type.endsWith('_tool_result')) return;
  const json = JSON.stringify(block, (key, value) => (key === 'encrypted_content' ? undefined : value));
  for (const match of json.match(/https?:\/\/[^\s"'<>\\]+/g) || []) {
    // Prose around a URL in code output can trail punctuation onto it.
    const key = urlKey(match.replace(/[.,;:)\]]+$/, ''));
    if (key) seen.add(key);
  }
}

/**
 * The model's picks that are safe to add: seen in a result, not the source
 * page, confident enough, one per page, strongest first.
 */
export function keepReferences(candidates: FoundReference[], seen: Set<string>, sourceUrl: string): FoundReference[] {
  const sourceKey = urlKey(sourceUrl);
  const kept = new Map<string, FoundReference>();
  for (const candidate of candidates) {
    const key = urlKey(candidate.url);
    const confidence = Math.round(Number(candidate.confidence));
    if (!key || key === sourceKey || !seen.has(key) || kept.has(key)) continue;
    if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE || confidence > 100) continue;
    const title = candidate.title?.trim().slice(0, 1024);
    const { startDate, endDate } = referenceDates(candidate);
    kept.set(key, {
      url: candidate.url.trim(),
      title: title || undefined,
      confidence,
      publishedDate: isYmd(candidate.publishedDate) ? candidate.publishedDate : undefined,
      startDate,
      endDate,
      reasoning: candidate.reasoning?.trim().slice(0, 2000) || undefined,
    });
  }
  return [...kept.values()].sort((a, b) => b.confidence - a.confidence).slice(0, MAX_REFERENCES);
}

/**
 * The model's summary with its [S] and [n] citations written as the links
 * they stand for: [S] the source, [n] the nth candidate it recorded. A
 * citation of a candidate that was not kept is dropped with it.
 */
export function citeSummary(summary: string | null | undefined, candidates: FoundReference[], kept: FoundReference[], sourceUrl: string): string | undefined {
  const html = summary?.trim();
  if (!html) return undefined;
  const keptKeys = new Set(kept.map((r) => urlKey(r.url)));
  const urlOf = (label: string) => {
    if (/^s$/i.test(label)) return sourceUrl;
    const candidate = candidates[Number(label) - 1];
    return candidate && keptKeys.has(urlKey(candidate.url)) ? candidate.url.trim() : undefined;
  };
  return citeLabels(html, urlOf);
}

// Writes each run of [S] and [n] citations in summary HTML as the links
// urlOf gives those labels, dropping labels it has no link for.
export function citeLabels(html: string, urlOf: (label: string) => string | undefined): string {
  return html.replace(/(?:\s*\[\s*(?:S|\d+)(?:\s*,\s*(?:S|\d+))*\s*\])+/gi, (run) => {
    const urls = new Set((run.match(/S|\d+/gi) || []).map(urlOf).filter((url): url is string => !!url));
    return [...urls].map(citeTag).join('');
  });
}

const isYmd = (value: string | null | undefined): value is string => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

// A candidate's start and end days, when well formed; an end before the start
// is dropped.
export function referenceDates(candidate: { startDate?: string | null; endDate?: string | null }) {
  const startDate = isYmd(candidate.startDate) ? candidate.startDate : undefined;
  const endDate = isYmd(candidate.endDate) && !(startDate && candidate.endDate < startDate) ? candidate.endDate : undefined;
  return { startDate, endDate };
}
