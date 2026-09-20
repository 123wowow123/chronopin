// A line about a company, for the panel a company: search opens with. Taken
// from the first sentences of its Wikipedia article's intro, through the same
// keyless Wikimedia API the logos come from (src/server/companyLogo.ts), and
// stored on the company row so every search for it is answered from the
// database. A company with no article in its row is looked up by name first,
// as the logos are.

import { getJson, searchWikiUrl, wikiTitle } from './companyLogo';

// TextExtracts answers at most 20 pages per request.
const BATCH = 20;
// Wikimedia rate-limits anonymous callers, and a backfill of every company is
// hundreds of requests: they are spaced out, and a request turned away is
// tried once more after a longer wait rather than losing the whole batch.
const PAUSE_MS = 400;
const RETRY_MS = 5000;
// About two lines in the panel.
export const MAX_LENGTH = 300;
const MAX_SENTENCES = 2;

// Ends a sentence in writing but not in fact: "Apple Inc. is an American..."
// is one sentence, and so is "Nintendo Co., Ltd. is a Japanese company".
const ABBREVIATION = /(?:^|[\s(])(?:[A-Z]|Inc|Ltd|Co|Corp|Cos|Pte|Pty|Plc|Bros|St|Mt|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|vs|etc|al|approx|est|no|Nos)\.$/;
// A pronunciation or "(listen)" aside, which reads as noise in a one-line blurb.
const PRONUNCIATION = /\s*\((?:[^()]*(?:\/[^()]*\/|ˈ|listen)[^()]*)\)/g;

type CompanyInput = { id: number; name?: string; wikiUrl?: string | null };
// failed marks a lookup Wikipedia turned away (a rate-limited backfill): the
// company is left unchecked so the next run tries it again, rather than being
// written off as having no article.
export type FoundDescription = { id: number; wikiUrl: string | null; description: string | null; failed: boolean };

// One { id, wikiUrl, description } per company given; either may be null when
// the company has no article, or an article with no usable intro.
export async function findDescriptions(companies: CompanyInput[]): Promise<FoundDescription[]> {
  const withWiki: CompanyInput[] = [];
  for (const company of companies) {
    if (company.wikiUrl || !company.name) {
      withWiki.push(company);
      continue;
    }
    withWiki.push({ ...company, wikiUrl: await searchWikiUrl(company.name) });
    await pause(PAUSE_MS);
  }

  // Every company that shares an article shares its lookup.
  const byTitle: Record<string, number[]> = {};
  for (const company of withWiki) {
    const title = wikiTitle(company.wikiUrl);
    if (title) (byTitle[title] = byTitle[title] || []).push(company.id);
  }
  const { intros, failed } = await introsByTitle(Object.keys(byTitle));

  return withWiki.map((company) => {
    const title = wikiTitle(company.wikiUrl) || '';
    return {
      id: company.id,
      wikiUrl: company.wikiUrl || null,
      description: firstSentences(intros[title] || ''),
      failed: failed.has(title),
    };
  });
}

// The intro of each article that has one, asked for 20 at a time, and the
// titles whose request was turned away even on the retry.
async function introsByTitle(titles: string[]): Promise<{ intros: Record<string, string>; failed: Set<string> }> {
  const intros: Record<string, string> = {};
  const failed = new Set<string>();
  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH);
    if (i) await pause(PAUSE_MS);
    try {
      const json = await getJsonRetrying(
        'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
          `&prop=extracts&exintro=1&explaintext=1&redirects=1&exlimit=${BATCH}&titles=` +
          encodeURIComponent(batch.join('|')),
      );
      const query = json.query || {};
      // A page's final title, back to every title that was asked for, so a
      // redirect or a normalized spelling still finds its company.
      const asked: Record<string, string[]> = {};
      (query.normalized || []).concat(query.redirects || []).forEach((step: { from: string; to: string }) => {
        asked[step.to] = (asked[step.to] || []).concat(step.from, asked[step.from] || []);
      });
      for (const page of query.pages || []) {
        if (!page.extract) continue;
        for (const title of [page.title].concat(asked[page.title] || [])) {
          intros[title] = page.extract;
        }
      }
    } catch (err) {
      console.log('Company description lookup err:', (err as Error).message);
      batch.forEach((title) => failed.add(title));
    }
  }
  return { intros, failed };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One more try after a wait: a backfill's hundreds of requests are answered
// with a 429 often enough that one refusal should not cost a batch of 20.
async function getJsonRetrying(url: string): Promise<any> {
  try {
    return await getJson(url);
  } catch {
    await pause(RETRY_MS);
    return getJson(url);
  }
}

// The opening of an article's intro as a blurb: the first sentences, up to
// MAX_SENTENCES of them and `max` characters, or null when there is nothing
// to show. A first sentence longer than `max` is cut at a word and ellipsed,
// which beats showing nothing about the company at all.
export function firstSentences(intro: string, max = MAX_LENGTH): string | null {
  const text = intro.replace(PRONUNCIATION, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const pieces = text.split(/(?<=[.!?])\s+(?=[A-Z(“"'])/);
  // An abbreviation's full stop is not the end of a sentence, so its piece
  // carries on into the next.
  const sentences = pieces.reduce<string[]>((all, piece) => {
    const last = all[all.length - 1];
    if (last && ABBREVIATION.test(last)) all[all.length - 1] = `${last} ${piece}`;
    else all.push(piece);
    return all;
  }, []);

  let blurb = '';
  for (const sentence of sentences.slice(0, MAX_SENTENCES)) {
    const next = blurb ? `${blurb} ${sentence}` : sentence;
    if (blurb && next.length > max) break;
    blurb = next;
  }
  if (blurb.length <= max) return blurb;
  // One very long sentence: cut it at the last whole word that fits.
  const cut = blurb.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`;
}
