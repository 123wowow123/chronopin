// A company's parent, from Wikidata's "parent organization" (P749), the current
// claim (no end time), reached from the company's English Wikipedia article.
// "Owned by" (P127) is not used: it names shareholders, people and ministries
// (Lukoil -> Leonid Fedun), not a company one is part of. The answer is the parent's English name
// and article, which Company.setParent turns into a Company row.

import { claimValue, getJson, wikidataIds, wikiTitle } from './companyLogo';

export type FoundParent = { name: string; wikiUrl: string | null };

const BATCH = 50;
const PAUSE_MS = 400;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The entity id a claim points at.
const target = (value: unknown): string | null => (value && typeof value === 'object' && 'id' in value ? String((value as { id: string }).id) : null);

// { [company id]: its parent, or null when Wikidata has none } for these
// companies (those with no Wikipedia article are left out: there is nothing to
// look the entity up by).
export async function findParents(companies: { id: number; wikiUrl: string | null }[]): Promise<Map<number, FoundParent | null>> {
  const result = new Map<number, FoundParent | null>();
  const withTitle = companies.map((c) => ({ id: c.id, title: wikiTitle(c.wikiUrl) })).filter((c): c is { id: number; title: string } => !!c.title);
  for (let i = 0; i < withTitle.length; i += BATCH) {
    const batch = withTitle.slice(i, i + BATCH);
    const qids = await wikidataIds(batch.map((c) => c.title));
    const own = [...new Set(Object.values(qids))];
    const claims = (await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${own.join('|')}`)).entities ?? {};
    const parentOf = (qid: string) => {
      const c = claims[qid]?.claims ?? {};
      return target(claimValue(c.P749));
    };
    const parentQids = [...new Set(own.map(parentOf).filter((q): q is string => !!q))];
    const details: Record<string, { name: string; wikiUrl: string | null }> = {};
    if (parentQids.length) {
      const json = await getJson(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|sitelinks&languages=en&sitefilter=enwiki&ids=${parentQids.join('|')}`,
      );
      for (const [qid, e] of Object.entries<any>(json.entities ?? {})) {
        const name = e.labels?.en?.value;
        const title = e.sitelinks?.enwiki?.title;
        if (name) details[qid] = { name, wikiUrl: title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` : null };
      }
    }
    for (const c of batch) {
      const qid = qids[c.title];
      const parent = qid ? parentOf(qid) : null;
      result.set(c.id, parent && details[parent] ? details[parent] : null);
    }
    await sleep(PAUSE_MS);
  }
  return result;
}
