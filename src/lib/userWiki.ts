// A signed-in user's preference wiki: the pins they open, watch, like and
// comment on, boiled down to the categories and companies they lean to and the
// pins they have opened. The timeline weighs a crowded day's cards by it (see
// bagSample.ts) when the admin setting is on, and it is written out as an Open
// Knowledge Format (v0.2) concept, like the link wikis (okf.ts).
//
// Pure: the server loads the signals (src/server/model/userWiki.ts).

import { frontmatter, OKF_VERSION } from './okf';

export type SignalKind = 'open' | 'watch' | 'like' | 'comment';

// One thing the user did to a pin, with the pin as it is now.
export type PreferenceSignal = {
  pinId: number;
  kind: SignalKind;
  at: Date | string;
  title: string;
  url: string;
  // The pin's categories: a signal's weight is shared out among them.
  categories: string[];
  company: string | null;
};

export type Affinity = { name: string; share: number };

export type UserPreference = {
  // Pins the user has opened, most recent first.
  clicked: number[];
  // Share of the user's (decayed) signal weight per category and company,
  // largest first; together each list sums to at most 1.
  categories: Affinity[];
  companies: Affinity[];
  signals: number;
};

// A watch says more than a like or a comment, and those more than an open.
export const SIGNAL_WEIGHT: Record<SignalKind, number> = { open: 1, like: 2, comment: 2, watch: 3 };
// Old signals fade: a signal counts half as much every HALF_LIFE_DAYS.
export const HALF_LIFE_DAYS = 60;
export const MAX_CLICKED = 500;
const MAX_AFFINITIES = 12;
// Shares below this are noise, not a preference.
const MIN_SHARE = 0.02;

const DAY_MS = 86_400_000;

function shares(weights: Map<string, { name: string; weight: number }>, total: number): Affinity[] {
  return [...weights.values()]
    .map(({ name, weight }) => ({ name, share: Math.round((weight / total) * 1000) / 1000 }))
    .filter((a) => a.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))
    .slice(0, MAX_AFFINITIES);
}

export function buildPreference(signals: PreferenceSignal[], now: Date = new Date()): UserPreference {
  const categories = new Map<string, { name: string; weight: number }>();
  const companies = new Map<string, { name: string; weight: number }>();
  const opened = new Map<number, number>(); // pin id -> latest open
  let total = 0;
  for (const signal of signals) {
    const at = +new Date(signal.at);
    const age = Math.max(0, (+now - at) / DAY_MS);
    const weight = SIGNAL_WEIGHT[signal.kind] * 0.5 ** (age / HALF_LIFE_DAYS);
    total += weight;
    // Names are case-insensitive in the database (citext), so here too. A
    // pin in two categories gives each half its weight, so the shares still
    // sum to at most 1.
    const own = (signal.categories ?? []).filter(Boolean);
    for (const [map, name, part] of [
      ...own.map((c) => [categories, c, weight / own.length] as const),
      [companies, signal.company, weight] as const,
    ]) {
      if (!name) continue;
      const entry = map.get(name.toLowerCase()) ?? { name, weight: 0 };
      entry.weight += part;
      map.set(name.toLowerCase(), entry);
    }
    if (signal.kind === 'open') opened.set(signal.pinId, Math.max(opened.get(signal.pinId) ?? 0, at));
  }
  return {
    clicked: [...opened]
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .slice(0, MAX_CLICKED)
      .map(([id]) => id),
    categories: total ? shares(categories, total) : [],
    companies: total ? shares(companies, total) : [],
    signals: signals.length,
  };
}

/* On the timeline */

// A pin the user has opened weighs 1 + CLICKED_BOOST times as much; one in a
// category or company they lean to, AFFINITY_BOOST times its share more.
export const CLICKED_BOOST = 2;
export const AFFINITY_BOOST = 2;

type Weighed = { id: number; categories?: string[] | null; company?: string | null };

// How much more a pin weighs for this user than for anyone else (1 = no
// change). `ids` are every pin the card stands for (a duplicate stack), so
// opening any of them counts.
export function personalWeigher(preference: UserPreference): (pin: Weighed, ids?: number[]) => number {
  const clicked = new Set(preference.clicked);
  const category = new Map(preference.categories.map((a) => [a.name.toLowerCase(), a.share]));
  const company = new Map(preference.companies.map((a) => [a.name.toLowerCase(), a.share]));
  return (pin, ids = [pin.id]) => {
    const opened = ids.some((id) => clicked.has(id)) ? CLICKED_BOOST : 0;
    // Its strongest category, so a pin in several is not boosted for each.
    const leaningCategory = Math.max(0, ...(pin.categories ?? []).map((c) => category.get(c.toLowerCase()) ?? 0));
    const leaning = leaningCategory + (pin.company ? (company.get(pin.company.toLowerCase()) ?? 0) : 0);
    return 1 + opened + AFFINITY_BOOST * leaning;
  };
}

// Whether the timeline weighs cards by each viewer's preference wiki.
// An admin setting - this is only its default.
export type PersonalBagSetting = { enabled: boolean };

export const DEFAULT_PERSONAL_BAG: PersonalBagSetting = { enabled: true };

export function parsePersonalBag(value: unknown): { setting: PersonalBagSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}

/* As OKF */

// No model writes it: the actor is the rules' version (bump it when they change).
export const USER_WIKI_GENERATOR = 'chronopin-user-wiki/1';
const RECENT = 15;

const percent = (share: number) => `${Math.round(share * 100)}%`;
const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

// The user's concept page: users/<id>-<userName>.md.
export function userWikiPage(
  user: { id: number; userName: string },
  preference: UserPreference,
  signals: PreferenceSignal[],
  builtAt: Date = new Date(),
): string {
  const recent: PreferenceSignal[] = [];
  for (const s of [...signals].sort((a, b) => +new Date(b.at) - +new Date(a.at))) {
    if (recent.length === RECENT) break;
    if (!recent.some((r) => r.pinId === s.pinId)) recent.push(s);
  }
  const list = (affinities: Affinity[]) => affinities.map((a) => `- ${a.name}: ${percent(a.share)}`).join('\n');
  const body = [
    `Built from ${preference.signals} signal(s): opening a pin counts ${SIGNAL_WEIGHT.open}, liking or commenting on one ${SIGNAL_WEIGHT.like}, watching one ${SIGNAL_WEIGHT.watch}, and every signal counts half as much each ${HALF_LIFE_DAYS} days.`,
    preference.categories.length ? `# Categories\n\n${list(preference.categories)}` : '',
    preference.companies.length ? `# Companies\n\n${list(preference.companies)}` : '',
    recent.length ? `# Recent pins\n\n${recent.map((s) => `- [${s.title.replace(/[[\]]/g, '')}](${s.url}) - ${s.kind}, ${day(s.at)}`).join('\n')}` : '',
    `# On the timeline\n\nWhen a day has more pins than the timeline shows, the cards are a weighted pick. With the admin setting on, ${preference.clicked.length} pin(s) this user has opened weigh ${1 + CLICKED_BOOST} times as much, and a pin in a category or company above weighs ${AFFINITY_BOOST} times its share more.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const tags = preference.categories.slice(0, 5).map((a) => a.name.toLowerCase());
  return `${frontmatter({
    type: 'Profile',
    title: `@${user.userName} preferences`,
    description: `What @${user.userName} opens, watches, likes and comments on, and what the timeline shows them first`,
    tags: tags.length ? tags : undefined,
    generated: { by: USER_WIKI_GENERATOR, at: builtAt },
    signal_count: preference.signals,
  })}\n\n${body}\n`;
}

export const userWikiPath = (user: { id: number; userName: string }) => `users/${user.id}-${user.userName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.md`;

// Users' pages as a bundle of their own: index.md, users/index.md, log.md.
export function userWikiBundle(pages: { userId: number; userName: string; page: string; builtAt: Date | string }[]): Map<string, string> {
  const files = new Map<string, string>();
  const entries = pages.map((p) => ({ ...p, path: userWikiPath({ id: p.userId, userName: p.userName }) }));
  for (const { path, page } of entries) files.set(path, page);
  files.set('users/index.md', `# Users\n\n${entries.map(({ path, userName }) => `* [@${userName}](${path.slice('users/'.length)}) - preferences`).join('\n')}\n`);
  files.set('index.md', `${frontmatter({ okf_version: OKF_VERSION })}\n\n# Chronopin users\n\n* [Users](users/) - ${entries.length} user preference wiki(s)\n`);
  const days = new Map<string, string[]>();
  for (const e of [...entries].sort((a, b) => +new Date(b.builtAt) - +new Date(a.builtAt))) {
    const d = day(e.builtAt);
    days.set(d, [...(days.get(d) ?? []), `* **Update**: Rebuilt [@${e.userName}](/${e.path})`]);
  }
  files.set('log.md', `# Update Log\n${[...days].map(([d, lines]) => `\n## ${d}\n${lines.join('\n')}`).join('\n')}\n`);
  return files;
}
