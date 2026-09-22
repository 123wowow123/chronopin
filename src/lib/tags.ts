// A pin's tags: short free-form metadata ("Tokyo Anime Award Festival 2024",
// "Studio Ghibli", "Artemis"), searched with tag: terms and shown in the tag
// cloud. They are also the pin concept's OKF `tags` (src/lib/okf.ts).
//
// Where they come from (PinTagView, 0038):
//   user    typed in the pin form (or a scrape's extracted tags, which land there)
//   auto    awards named in the pin's own description and summary (awardTagsInText),
//           and the prediction markets its links cite (marketTags)
//   award   one per award body and year the work won in (PinAward)
//           and a "... Nominee" tag (kind nomination) per body and year it was only nominated in
//   thread  THREAD_TAG on a pin that answers another pin or is answered by one
//           (0056; derived too, so threading a pin tags both ends at once)
//
// The thread tag is the site's own rather than anyone's: kind 'reserved'
// (0063). So are the filters that read as tags without being stored as any -
// the confidence: levels and score bands - see RESERVED_TAGS below.
//
//   user    also the pin's categories: tags of kind 'category', named from the
//           list in src/lib/categories.ts (0043 turned the old column into these)
//
// Pure: parsing, naming and sizing only.

import { isCategory } from './categories';
import { pinMarketRefs } from './predictionMarkets';
import { CONFIDENCE_BANDS } from './referenceConfidence';

export type TagKind = 'award' | 'nomination' | 'topic' | 'category' | 'reserved';
export type TagSource = 'user' | 'auto' | 'award' | 'thread';

export type PinTagJson = { name: string; kind: TagKind; source: TagSource };
// category: the category most of the tag's pins carry (none for a category
// tag itself), which the cloud's grouped mode files it under.
export type TagCount = { name: string; kind: TagKind; count: number; category?: string | null };
// A cloud entry: a lone tag, or a group of them with what it wraps - an
// award body's years, or a category's tags (which may be groups themselves).
export type TagGroup = TagCount & { members?: TagGroup[] };

export const MAX_TAG_LENGTH = 80;
export const MAX_TAGS = 20;

// Words that make a name an award: any body, ceremony or prize.
const AWARD_WORD = /\b(awards?|prize|prix|oscars?|emmys?|grammys?|tonys?|golden globes?|baftas?|annies?|razzies?|medal|trophy|laureates?)\b|\bfilm festival\b|\baward festival\b/i;

// A nomination's tag, typed or from the award catalogue (nominationTag).
const NOMINEE = /\bnominee$/i;

export function tagKind(name: string): TagKind {
  if (isReserved(name)) return 'reserved';
  if (isCategory(name)) return 'category';
  if (NOMINEE.test(name)) return 'nomination';
  return AWARD_WORD.test(name) ? 'award' : 'topic';
}

// A tag as stored: one line, no leading "#", no double quotes (they delimit
// search terms, see src/lib/searchTerms.ts), at most MAX_TAG_LENGTH long.
// Null when nothing is left.
export function cleanTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw
    .replace(/["“”„‟″]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/[,;]+$/, '')
    .trim()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
  return name || null;
}

// Tags without repeats, ignoring case; the first spelling wins.
export function uniqueTags(names: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = cleanTag(raw);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

// A request body's tags: an array of names, or one comma-separated string as
// the form's field holds them. undefined when the body has none, which leaves
// a pin's tags as they are (a PUT without tags must not wipe them).
export function parseTags(input: unknown): string[] | undefined {
  if (input === undefined || input === null) return undefined;
  const list = Array.isArray(input) ? input : typeof input === 'string' ? splitTags(input) : [];
  return uniqueTags(list.map((t) => (typeof t === 'string' ? t : typeof t === 'object' && t ? (t as { name?: unknown }).name : null) as string)).slice(0, MAX_TAGS);
}

// The form field's text as tags: commas separate them.
export function splitTags(text: string): string[] {
  return uniqueTags(text.split(/[,\n]/));
}

export function joinTags(names: string[]): string {
  return names.join(', ');
}

/* Awards */

// The tag an award body's year gets: "Tokyo Anime Award Festival 2024".
export function awardTag(award: { body: string; year: number }): string {
  return `${award.body} ${award.year}`;
}

// A body's year the work was only nominated in: "Crunchyroll Anime Awards 2024 Nominee".
export function nominationTag(award: { body: string; year: number }): string {
  return `${awardTag(award)} Nominee`;
}

// A capitalised word, an ordinal ("97th") or a joiner inside a name.
const WORD = String.raw`(?:[A-Z][\w'’.&-]*|\d{1,3}(?:st|nd|rd|th))`;
const JOIN = String.raw`(?:of|and|&|for|the|de|du|des|la|le)`;
// What ends an award's name. "Festival" only as an award or film festival: a
// music festival hands out nothing.
// Longest first, so "Award Festival" is not cut short at "Award".
const END = String.raw`(?:Award Festival|Film Festival|Awards?|Prize|Prix|Oscars|Emmys|Grammys|Golden Globes?|BAFTAs?)`;
const AWARD_IN_TEXT = new RegExp(
  String.raw`(?:\b((?:19|20)\d\d)\s+)?\b((?:${WORD}\s+(?:${JOIN}\s+){0,2}){0,5}${END})\b(?:\s+((?:19|20)\d\d)\b)?`,
  'g',
);
// Sentence openers a capitalised run can start with that are no part of a
// name, and joiners left at its front once they go.
const LEAD = /^(?:(?:The|A|An|At|In|On|Its|His|Her|Their|This|That|Won|Wins|Winner|Winning|Best|Also|And|For|of|and|&|for|the|de|du|des|la|le)\s+)+/;
// The few names whose "The" is their own.
const KEEPS_THE = /^(?:Game Awards)\b/;

const STARTS_NAME = new RegExp(String.raw`^${WORD}\s`);

// Bodies held once a year since their first, whose numbered editions are
// written as the ceremony's year so they meet the same body's other tags
// ("8th Crunchyroll Anime Awards" is "Crunchyroll Anime Awards 2024", which
// the award catalogue tags too): the year before the 1st edition.
const EDITION_BASE: Record<string, number> = {
  'crunchyroll anime awards': 2016,
  'academy awards': 1928,
  'golden globe awards': 1943,
  'annie awards': 1973,
};
const ORDINAL = /^(\d{1,3})(?:st|nd|rd|th)\s+(.+)$/;

// Awards a pin's own prose names, as tags: "won the 2024 Crunchyroll Anime
// Awards" -> "Crunchyroll Anime Awards 2024", "nominated for ... at the 2024
// Crunchyroll Anime Awards" -> "Crunchyroll Anime Awards 2024 Nominee". Only a name with its year or an
// edition's ordinal ("97th Academy Awards") is specific enough to tag; a bare
// "award" could be any. Meant for descriptions and summaries, which are in
// sentence case: a title-cased headline would run its verbs into the name.
export function awardTagsInText(text: string | null | undefined): string[] {
  if (!text) return [];
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ');
  const found: string[] = [];
  for (const match of plain.matchAll(AWARD_IN_TEXT)) {
    const [, before, rawName, after] = match;
    // "Nominated for Best Action at the 8th Crunchyroll Anime Awards" is a
    // nomination: the nearer of a win word and a nomination word earlier in
    // the sentence decides.
    const lead = plain.slice(0, match.index).split(/[.;!?](?:\s|$)/).pop() ?? '';
    const cue = [...lead.matchAll(/\b(won|wins?|winner|winning|nominat\w*|shortlisted|up for)\b/gi)].pop()?.[1];
    const nominated = !!cue && /^(nominat|shortlisted|up for)/i.test(cue);
    const tag = (name: string) => (nominated ? `${name} Nominee` : name);
    const stripped = rawName.replace(LEAD, '').trim();
    const name = KEEPS_THE.test(stripped) ? `The ${stripped}` : stripped;
    const year = after || before;
    // Needs a proper name ahead of the ending word ("Crunchyroll Anime Awards", not "Awards").
    if (!STARTS_NAME.test(name)) continue;
    const edition = ORDINAL.exec(name);
    const base = edition ? EDITION_BASE[edition[2].toLowerCase()] : undefined;
    if (edition && base) found.push(tag(`${edition[2]} ${base + Number(edition[1])}`));
    else if (year) found.push(tag(`${edition ? edition[2] : name} ${year}`));
    else if (edition) found.push(tag(name));
  }
  return uniqueTags(found);
}

/* Threads */

// What a pin in a thread is tagged: it answers another pin, or one answers it.
// PinTagView derives the tag (0056); nothing writes it, and its kind there is
// what tagKind says here - 'reserved' (0063), since the site alone writes it.
export const THREAD_TAG = 'Thread';

/* Reserved */

// The site's own filters, which read as tags without being anyone's: the
// thread tag, and how well a pin's date and evidence are backed (the
// confidence: terms a date badge and a score badge write). They stand in the
// tag cloud and in the search box's suggestions beside real tags, marked as
// the site's, and picking one writes the term the search already understands
// (src/lib/searchTerms.ts) rather than a tag: term.
//
// Nobody can tag a pin one of these names: PinTag drops them on the way in
// (src/server/model/pinTag.ts), so what a reserved name filters by is always
// the site's own answer and never a curator's typing.
export type ReservedTag = {
  // Its label's message key (reserved.<key>), since these are the site's
  // words and are read in the page's language, as a category's name is.
  key: string;
  // The English name, which is what the cloud counts and suggests under.
  name: string;
  // The term a pick writes.
  field: 'tag' | 'confidence';
  value: string;
  icon: 'thread' | 'shield';
};

// The date confidence levels, firmest first, as their badge writes them
// (src/components/pin/DateConfidence.tsx): the stored "unknown" is the badge's
// UNVERIFIED, and the term takes either word.
const CONFIDENCE_LEVELS = ['confirmed', 'scheduled', 'estimated', 'delayed', 'unverified'] as const;
// The level the term's value stands for in the database, where they differ.
const STORED_LEVEL: Record<string, string> = { unverified: 'unknown' };

// Thread first, then how firmly the date is given, then how well the pin is
// evidenced overall (high to low): the order they are shown in, which is
// their own and not their counts'.
export const RESERVED_TAGS: ReservedTag[] = [
  { key: 'thread', name: THREAD_TAG, field: 'tag', value: THREAD_TAG, icon: 'thread' },
  ...CONFIDENCE_LEVELS.map((level): ReservedTag => ({ key: level, name: capitalize(level), field: 'confidence', value: level, icon: 'shield' })),
  ...[...CONFIDENCE_BANDS].reverse().map(({ band }): ReservedTag => ({ key: band, name: `${capitalize(band)} confidence`, field: 'confidence', value: band, icon: 'shield' })),
];

function capitalize(word: string) {
  return word[0].toUpperCase() + word.slice(1);
}

// The reserved filter of this name, or undefined for an ordinary tag.
export function reservedTag(name: string): ReservedTag | undefined {
  const wanted = String(name || '').toLowerCase();
  return RESERVED_TAGS.find((r) => r.name.toLowerCase() === wanted);
}

export const isReserved = (name: string): boolean => !!reservedTag(name);

// Which reserved filters a query already holds, in the order above: its
// tag: terms name the thread tag, and its confidence: terms the levels and
// bands (parseSearchQuery stores a level as the database spells it).
export function reservedPicked(query: { tags: string[]; confidences: string[]; confidenceBands: string[] }): string[] {
  const has = (r: ReservedTag) =>
    r.field === 'tag'
      ? query.tags.some((tag) => tag.toLowerCase() === r.value.toLowerCase())
      : query.confidences.includes(STORED_LEVEL[r.value] ?? r.value) || query.confidenceBands.includes(r.value);
  return RESERVED_TAGS.filter(has).map((r) => r.name);
}

// Every spelling of a reserved filter's term value, for taking it back out of
// a query: a date confidence level is stored as the database spells it, so
// confidence:unverified and confidence:unknown are the same filter.
export function reservedValues(reserved: ReservedTag): string[] {
  const stored = STORED_LEVEL[reserved.value];
  return stored ? [reserved.value, stored] : [reserved.value];
}

// A reserved filter's counted name, for the counts the cloud reads: a date
// confidence level as the database stores it ("unknown" -> "Unverified"), or
// a score band ("low" -> "Low confidence").
export function reservedName(field: 'confidence' | 'band', value: string): string | undefined {
  const wanted = String(value).toLowerCase();
  const level = Object.entries(STORED_LEVEL).find(([, stored]) => stored === wanted)?.[0] ?? wanted;
  return RESERVED_TAGS.find((r) => r.field === 'confidence' && r.value === (field === 'band' ? wanted : level))?.name;
}

// The reserved filters a typed word starts: "conf" suggests Confirmed and
// the three confidence bands, "thr" the thread tag, "low conf" the one band.
// Matched a word at a time, as the tag suggestions are (wordStartPattern),
// and from the front for a phrase. One letter is not enough: "c" would put
// four site filters over the tags before the typing says which was meant.
export function reservedSuggestions(text: string): ReservedTag[] {
  const typed = String(text || '').trim().toLowerCase();
  if (typed.length < 2) return [];
  return RESERVED_TAGS.filter((r) => {
    const name = r.name.toLowerCase();
    return name.startsWith(typed) || name.split(/\s+/).some((word) => word.startsWith(typed));
  });
}

/* Prediction markets */

export const PREDICTION_MARKET_TAG = 'Prediction Market';

// The exchanges a pin's source or references link a market on ("Kalshi",
// "Polymarket", "Polymarket US"), and "Prediction Market" for any of them.
// The same links that give it live odds (src/lib/predictionMarkets.ts).
export function marketTags(pin: { sourceUrl?: string | null; references?: { url?: string | null }[] | null }): string[] {
  const exchanges = pinMarketRefs(pin).map((ref) => ref.source);
  return exchanges.length ? uniqueTags([PREDICTION_MARKET_TAG, ...exchanges]) : [];
}

// Everything a save derives: awards in the prose and markets in the links.
export function autoTags(pin: {
  description?: string | null;
  longFormSummary?: string | null;
  sourceUrl?: string | null;
  references?: { url?: string | null }[] | null;
}): string[] {
  return uniqueTags([...awardTagsInText(pin.description), ...awardTagsInText(pin.longFormSummary), ...marketTags(pin)]);
}

/* The cloud */

// Each tag's size step (1 smallest to `levels`), by its count on a log scale
// between the least and most used shown, so one huge tag does not flatten the rest.
export function cloudSteps(tags: TagCount[], levels = 5): Map<string, number> {
  const steps = new Map<string, number>();
  if (!tags.length) return steps;
  const logs = tags.map((t) => Math.log(Math.max(t.count, 1)));
  const lo = Math.min(...logs);
  const hi = Math.max(...logs);
  const middle = Math.ceil(levels / 2);
  tags.forEach((t, i) => steps.set(t.name.toLowerCase(), hi === lo ? middle : 1 + Math.round(((logs[i] - lo) / (hi - lo)) * (levels - 1))));
  return steps;
}

// The tags to show: the busiest `limit`, plus any picked that fell outside
// them. Picked ones first, then by name, so the cloud does not reshuffle as
// counts move and what is picked is never scrolled out of sight.
export function cloudTags(counts: TagCount[], selected: string[], limit: number): TagCount[] {
  const top = [...counts].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
  const shown = new Set(top.map((t) => t.name.toLowerCase()));
  for (const name of selected) {
    if (shown.has(name.toLowerCase())) continue;
    shown.add(name.toLowerCase());
    top.push(counts.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? { name, kind: tagKind(name), count: 0 });
  }
  const picked = new Set(selected.map((name) => name.toLowerCase()));
  const rank = (t: TagCount) => (picked.has(t.name.toLowerCase()) ? 0 : 1);
  return top.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/* Groups */

// The larger category a tag wraps up into, or null when it stands alone:
// every year and nomination of an award body is that body ("Crunchyroll Anime
// Awards 2024 Nominee" -> "Crunchyroll Anime Awards"), and each prediction
// market exchange is "Prediction Market".
export function tagParent(name: string, kind: TagKind = tagKind(name)): string | null {
  if (kind === 'award' || kind === 'nomination') {
    const body = name.replace(NOMINEE, '').replace(/\s+(?:1[89]|20)\d\d\s*$/, '').trim();
    return body && body.toLowerCase() !== name.toLowerCase() ? body : null;
  }
  return MARKET_EXCHANGES.has(name.toLowerCase()) ? PREDICTION_MARKET_TAG : null;
}

const MARKET_EXCHANGES = new Set(['kalshi', 'polymarket', 'polymarket us']);

// The counts with tags sharing a parent folded into one entry that keeps them
// as `members` (busiest first). Only a parent of two or more is made; a group
// counts the sum of its members' pins, so a pin carrying several of them is
// counted for each. Where the parent is itself a tag it joins its members.
export function groupTags(counts: TagCount[]): TagGroup[] {
  return wrapInCategories(groupFamilies(counts));
}

// Award bodies' years and the market exchanges, each folded into one entry.
function groupFamilies(counts: TagCount[]): TagGroup[] {
  const parents = new Map<string, { name: string; members: TagCount[] }>();
  for (const tag of counts) {
    const parent = tagParent(tag.name, tag.kind);
    const key = (parent ?? tag.name).toLowerCase();
    if (!parent && !counts.some((t) => t !== tag && tagParent(t.name, t.kind)?.toLowerCase() === key)) continue;
    const group = parents.get(key) ?? { name: parent ?? tag.name, members: [] };
    group.members.push(tag);
    parents.set(key, group);
  }
  const grouped = new Set<TagCount>();
  const groups: TagGroup[] = [];
  for (const { name, members } of parents.values()) {
    if (members.length < 2) continue;
    members.forEach((m) => grouped.add(m));
    members.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const kind = members.some((m) => m.kind === 'award') ? 'award' : members[0].kind;
    groups.push({ name, kind, count: members.reduce((n, m) => n + m.count, 0), members, category: mostCommonCategory(members) });
  }
  return [...counts.filter((t) => !grouped.has(t)), ...groups];
}

// The category most of a group's pins carry: its members', weighted by count.
function mostCommonCategory(members: TagCount[]): string | null {
  const weight = new Map<string, { name: string; n: number }>();
  for (const m of members) {
    if (!m.category) continue;
    const key = m.category.toLowerCase();
    const entry = weight.get(key) ?? { name: m.category, n: 0 };
    entry.n += m.count;
    weight.set(key, entry);
  }
  return [...weight.values()].sort((a, b) => b.n - a.n)[0]?.name ?? null;
}

// Categories on top: every other entry goes under the category most of its
// pins carry, when that category is among the tags. A category counts its own
// pins, not its members'. One with nothing under it stays a lone tag.
function wrapInCategories(entries: TagGroup[]): TagGroup[] {
  const categories = new Map(entries.filter((e) => e.kind === 'category').map((e) => [e.name.toLowerCase(), { ...e, members: [] as TagGroup[] }]));
  const loose: TagGroup[] = [];
  for (const entry of entries) {
    if (entry.kind === 'category') continue;
    const home = entry.category ? categories.get(entry.category.toLowerCase()) : undefined;
    if (home) home.members.push(entry);
    else loose.push(entry);
  }
  const wrapped = [...categories.values()].map(({ members, ...category }) =>
    members.length ? { ...category, members: members.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) } : category,
  );
  return [...loose, ...wrapped];
}

// Every tag inside an entry, however deep.
export function tagMembers(entry: TagGroup): TagGroup[] {
  return (entry.members ?? []).flatMap((m) => [m, ...tagMembers(m)]);
}

// Which cloud entries read as picked: a group when any of its members is.
export function groupSelection(groups: TagGroup[], selected: string[]): string[] {
  const picked = new Set(selected.map((s) => s.toLowerCase()));
  const out = new Set(selected);
  const visit = (g: TagGroup): boolean => {
    let any = false;
    for (const m of g.members ?? []) if (visit(m) || picked.has(m.name.toLowerCase())) any = true;
    if (any) out.add(g.name);
    return any;
  };
  groups.forEach(visit);
  return [...out];
}

// Postgres regexes (case-insensitive) for the tags a tag: term stands for
// besides itself: its own years and nominations, and for "Prediction Market"
// the exchanges. So a search on a group's name finds every pin in the group.
export function tagGroupPatterns(names: string[]): string[] {
  const patterns = names.map((n) => `^${n.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(\\s+(1[89]|20)[0-9]{2})?(\\s+nominee)?$`);
  if (names.some((n) => n.toLowerCase() === PREDICTION_MARKET_TAG.toLowerCase())) {
    patterns.push(`^(${[...MARKET_EXCHANGES].join('|')})$`);
  }
  return patterns;
}
