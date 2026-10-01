// A company's names in the scripts the site's languages write that are not
// Latin (Company.localNames, 0105): 古驰, 구찌, グッチ, غوتشي for Gucci.
//
// The semantic model reads a brand written in another script as words it has
// never seen, so 古驰新任首席执行官 ("Gucci's new CEO") found nothing about
// Gucci; with "Gucci" beside it, the pin ranks second. Search hands the model
// the company's own name beside any of these it finds in the text
// (withCompanyNames). A Latin name needs none of this: the model knows it.
//
// The names are Wikidata's labels and aliases in those languages, reached
// from the company's Wikipedia article, as its logo is (companyLogo.ts).

import { batched, getJson, wikidataIds, wikiTitle } from './companyLogo';

// Wikidata's codes for the site's languages written in another script
// (Chinese under each of its variants).
const LANGUAGES = ['zh', 'zh-hans', 'zh-hant', 'zh-cn', 'zh-tw', 'zh-hk', 'ja', 'ko', 'hi', 'ar', 'th', 'ru'];

// Scripts written without spaces between words (Korean spaces its words but
// runs nouns and particles together), where two characters already make a
// name (古驰, 애플).
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
const OTHER_SCRIPT_LETTER = /(?!\p{Script=Latin})\p{L}/u;
const HAN_OR_THAI = /[\p{Script=Han}\p{Script=Thai}]/u;
// Katakana and its long-vowel mark, which Unicode files under no script.
const KATAKANA = /[\p{Script=Katakana}ー]/u;
const HANGUL = /\p{Script=Hangul}/u;
const ARABIC = /\p{Script=Arabic}/u;
// A letter, or a vowel sign (Hindi) that belongs to the letter before it.
const LETTER = /[\p{L}\p{M}]/u;
// What Arabic writes onto the front of a word: and, so, with, as, for, the.
const ARABIC_PREFIX = /^(?:[وف]?[بكل]?(?:ال)?|[وف]?لل)$/u;

// Whether the name found at [at, end) of the text stands as a word of its
// own there, the way its script marks one, rather than being part of a
// longer word: マック (McDonald's) is in ポトマック (Potomac), 贝尔 (Bell) in
// 诺贝尔 (Nobel), ديل (Dell) in غلينديل (Glendale).
function standsAlone(text: string, at: number, end: number, name: string): boolean {
  const before = text[at - 1] || '';
  const after = text[end] || '';
  // Chinese and Thai mark no words at all: a longer name is trusted
  // anywhere, two characters only where the text starts or turns from
  // another script or a sign (OpenAI 甲骨文, 古驰新任).
  if (HAN_OR_THAI.test(name[0])) return [...name].length > 2 || !HAN_OR_THAI.test(before);
  // Japanese writes a borrowed name in katakana between other scripts.
  if (KATAKANA.test(name[0])) return !KATAKANA.test(before) && !KATAKANA.test(after);
  // Korean puts particles after a word (구찌의, 애플은), never before it.
  if (HANGUL.test(name[0])) return !HANGUL.test(before);
  // Arabic joins a few short words onto the front of the next (لغوتشي, "for
  // Gucci"): only those may come before the name within its word, and only
  // before a name of four letters or more - with one, ديل (Dell) is بديل,
  // "alternative".
  if (ARABIC.test(name[0])) {
    const word = text.slice(0, at).match(/\p{Script=Arabic}*$/u)![0];
    return (word === '' || ([...name].length > 3 && ARABIC_PREFIX.test(word))) && !LETTER.test(after);
  }
  return !LETTER.test(before) && !LETTER.test(after);
}

// What a company's name carries besides the name itself, which a search
// rarely types: 甲骨文公司 is searched as 甲骨文, شركة أبل as أبل.
const SUFFIXES = /\s*(?:股份有限公司|有限公司|公司|集团|集團|株式会社|グループ|그룹)$/u;
const PREFIXES = /^(?:株式会社|شركة|บริษัท)\s*/u;
const QUALIFIER = /\s*[(（][^)）]*[)）]\s*$/u;

// A name too short to say a company rather than a word that happens to be in
// it: one CJK character, or two letters of a spaced script.
function longEnough(name: string): boolean {
  const letters = [...name.replace(/\s+/g, '')].length;
  return UNSPACED.test(name) ? letters >= 2 : letters >= 3;
}

// The usable names among a Wikidata entity's labels and aliases: the ones in
// another script, each also without a company suffix or prefix, deduplicated.
export function localNamesOf(entity: {
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, { value: string }[]>;
}): string[] {
  const names = new Set<string>();
  for (const language of LANGUAGES) {
    const written = [entity.labels?.[language]?.value, ...(entity.aliases?.[language] || []).map((alias) => alias.value)];
    for (const value of written) {
      if (!value) continue;
      const name = value.replace(QUALIFIER, '').trim();
      for (const form of [name, name.replace(SUFFIXES, '').replace(PREFIXES, '').trim()]) {
        if (OTHER_SCRIPT_LETTER.test(form) && longEnough(form)) names.add(form);
      }
    }
  }
  return [...names];
}

// One list of names per company given ([] when Wikidata has none, or the
// company has no Wikipedia article to reach it from).
export async function findLocalNames(companies: { id: number; wikiUrl: string | null }[]): Promise<{ id: number; names: string[] }[]> {
  const titles = [...new Set(companies.map((c) => wikiTitle(c.wikiUrl)).filter((t): t is string => !!t))];
  const qidByTitle = titles.length ? await wikidataIds(titles) : {};
  const entities = await batched([...new Set(Object.values(qidByTitle))], async (batch) => {
    const json = await getJson(
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|aliases' +
        `&languages=${LANGUAGES.join('|')}&ids=${batch.join('|')}`,
    );
    return Object.entries(json.entities || {}) as [string, Parameters<typeof localNamesOf>[0]][];
  });
  const byQid = new Map(entities);
  return companies.map((c) => {
    const title = wikiTitle(c.wikiUrl);
    const entity = title ? byQid.get(qidByTitle[title]) : undefined;
    return { id: c.id, names: entity ? localNamesOf(entity) : [] };
  });
}

// Each local name with the company's own: [古驰, Gucci].
export type NameIndex = [local: string, name: string][];

// The text with the companies it names in another script named after it as
// the companies name themselves, for the semantic model to read: 古驰新任首席执行官
// -> "古驰新任首席执行官 Gucci". Longest names first, and a name inside one already
// found is no second company (苹果 in 苹果公司). At most `limit` companies.
export function withCompanyNames(text: string, index: NameIndex, limit = 3): string {
  if (!OTHER_SCRIPT_LETTER.test(text)) return text;
  const lower = text.toLowerCase();
  const found: string[] = [];
  const taken: [number, number][] = [];
  for (const [local, name] of index) {
    if (found.length >= limit) break;
    const at = lower.indexOf(local.toLowerCase());
    if (at < 0 || found.includes(name) || lower.includes(name.toLowerCase())) continue;
    const end = at + local.length;
    if (taken.some(([from, to]) => at >= from && end <= to)) continue;
    if (!standsAlone(lower, at, end, local)) continue;
    taken.push([at, end]);
    found.push(name);
  }
  return found.length ? `${text} ${found.join(' ')}` : text;
}

// The index sorted for withCompanyNames: longest local names first, each
// name once, for the first of the rows that has it.
export function nameIndex(rows: { name: string; localNames: string[] | null }[]): NameIndex {
  const byLocal = new Map<string, string>();
  for (const row of rows) {
    for (const local of row.localNames || []) {
      if (!byLocal.has(local)) byLocal.set(local, row.name);
    }
  }
  return [...byLocal].sort((a, b) => b[0].length - a[0].length);
}
