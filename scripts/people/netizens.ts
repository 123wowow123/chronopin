// Adds popular online creators to the Netizens tab (role 'netizen'), from
// Wikidata only: the entity's own English description as the office line, birth
// date (P569), portrait (P18), official website (P856) and the English Wikipedia
// link. Nothing is written that Wikidata does not state. Safe to run again.
//
//   npx tsx scripts/people/netizens.ts [--save]     (dry run without --save)

import '../env';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import { topicSlug } from '@/lib/topics';

const NAMES = [
  'MrBeast', 'PewDiePie', 'Markiplier', 'Kai Cenat', 'IShowSpeed', 'Ninja', 'Pokimane', 'xQc', 'Ludwig Ahgren',
  'Marques Brownlee', 'Emma Chamberlain', 'Charli D\'Amelio', 'Khaby Lame', 'Logan Paul', 'Mark Rober',
  'Michael Stevens', 'Dream', 'Valkyrae', 'Dr Disrespect', 'Lilly Singh', 'Lex Fridman',
];
const KIND = /youtube|streamer|influencer|content creator|tiktok|podcast|vlogger|internet personality|twitch|online|blogger|media personality|social media/i;
const UA = { 'User-Agent': 'ChronoPin people importer (https://www.chronopin.com)' };

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

type Claim = { mainsnak?: { datavalue?: { value?: any } } };
const first = (claims: Record<string, Claim[]> | undefined, p: string) => claims?.[p]?.[0]?.mainsnak?.datavalue?.value;

(async () => {
  const save = process.argv.includes('--save');
  for (const name of NAMES) {
    const search = await get<{ search: { id: string; label: string; description?: string }[] }>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&limit=8&format=json`,
    );
    const hit = search.search.find((s) => KIND.test(s.description ?? ''));
    if (!hit) { console.log(`MISS  ${name}`); continue; }
    const ent = (await get<any>(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${hit.id}&props=claims|sitelinks|labels&sitefilter=enwiki&format=json`)).entities[hit.id];
    const label: string = ent.labels?.en?.value ?? hit.label;
    const birth = /^\+(\d{4}-\d{2}-\d{2})/.exec(first(ent.claims, 'P569')?.time ?? '')?.[1] ?? null;
    const validBirth = birth && !birth.endsWith('-00') && !birth.includes('-00-') ? birth : null;
    const image = first(ent.claims, 'P18');
    const site = first(ent.claims, 'P856');
    const wiki = ent.sitelinks?.enwiki?.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(ent.sitelinks.enwiki.title.replace(/ /g, '_'))}` : null;
    const input = {
      name: label,
      role: 'netizen' as const,
      office: hit.description ? hit.description.replace(/\s*\(born \d{4}\)$/, '').replace(/^./, (c) => c.toUpperCase()) : null,
      jurisdiction: 'Online',
      birthDate: validBirth,
      wikidataId: hit.id,
      wikiUrl: wiki,
      websiteUrl: typeof site === 'string' ? site : null,
      photoUrl: image ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}?width=480` : null,
      photoCredit: image ? `Wikimedia Commons, File:${image}` : null,
    };
    console.log(`${save ? 'SAVE' : 'DRY '} ${name} -> ${label} ${hit.id} | ${input.office} | ${input.birthDate ?? '-'} | ${input.photoUrl ? 'photo' : '-'} | ${wiki ? 'wiki' : '-'}`);
    if (save && wiki) await Person.save(input as never);
    await new Promise((r) => setTimeout(r, 400));
  }
  await db.closeConnection();
})();
