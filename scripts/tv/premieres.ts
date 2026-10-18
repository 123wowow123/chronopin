// Upcoming television season premieres as pins, from TVmaze's forward
// schedule (api.tvmaze.com, free, no key).
//
// One call to /schedule/full returns every future episode TVmaze knows about,
// so the whole vertical costs one fetch plus one per show for its episode
// count. Only a season's first episode becomes a pin, and only for scripted
// and animated shows above a popularity weight, because the raw schedule is
// mostly reality and daytime strands.
//
// The pin carries no place of its own: it is a TV pin with a company,
// so the save puts it at the broadcaster's headquarters, the same rule that
// places a film at its studio (src/server/studioLocation.ts).
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run tv:premieres
//   npm run tv:premieres -- --dry-run             list what would happen
//   npm run tv:premieres -- --min-weight 90       widen the net (default 95)
//   npm run tv:premieres -- --from 2027-01-01     only premieres from then on
//   npm run tv:premieres -- --limit 20            at most this many pins

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'min-weight': { type: 'string', default: '95' },
    from: { type: 'string', default: '' },
    to: { type: 'string', default: '' },
    limit: { type: 'string', default: '40' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

const FULL_SCHEDULE = 'https://api.tvmaze.com/schedule/full';
const UA = { 'User-Agent': 'chronopin (tv premieres)' };

// The schedule is dominated by strands that are not works with a premiere:
// panel shows, daytime, sport and news run continuously.
const KINDS = ['Scripted', 'Animation', 'Documentary'];

// The broadcaster's Wikipedia article, so the headquarters lookup (Wikidata
// P159) resolves the right company rather than a name search's best guess.
// A channel that is not here still gets a pin; its company is resolved by
// name, which is what the company logo lookup already does.
//
// A streaming brand points at the company that owns it, not at the service's
// own article: Wikidata files "Prime Video" and "Disney+" as services, which
// carry no headquarters, so the pin would have nowhere to go. The same goes
// for a channel whose own article gives only a state (FX's says Texas).
const WIKI: Record<string, string> = {
  ABC: 'American_Broadcasting_Company', CBS: 'CBS', NBC: 'NBC', FOX: 'Fox_Broadcasting_Company',
  HBO: 'HBO', 'HBO Max': 'HBO_Max', Max: 'HBO_Max', Netflix: 'Netflix', Hulu: 'Hulu',
  'Apple TV': 'Apple_Inc.', 'Apple TV+': 'Apple_Inc.', 'Prime Video': 'Amazon_(company)',
  'Disney+': 'The_Walt_Disney_Company', 'Paramount+': 'Paramount+',
  Peacock: 'NBCUniversal', FX: 'The_Walt_Disney_Company', FXX: 'The_Walt_Disney_Company',
  'USA Network': 'USA_Network', PBS: 'PBS', AMC: 'AMC_(TV_channel)',
  Showtime: 'Showtime_(TV_network)', 'The CW': 'The_CW', 'Adult Swim': 'Adult_Swim',
  'BBC One': 'BBC_One', 'BBC Two': 'BBC_Two', 'BBC iPlayer': 'BBC', ITV1: 'ITV1',
  'Sky Atlantic': 'Sky_Atlantic', 'Comedy Central': 'Comedy_Central',
  'Cartoon Network': 'Cartoon_Network', Syfy: 'Syfy', Bravo: 'Bravo_(American_TV_network)',
  'CBC Gem': 'Canadian_Broadcasting_Corporation', Citytv: 'Citytv',
};

type Show = {
  id: number; name: string; type: string; language: string | null; genres: string[];
  status: string; weight: number; summary: string | null; premiered: string | null;
  officialSite: string | null; url: string;
  network: { name: string } | null; webChannel: { name: string } | null;
  image: { original: string } | null;
};
type Episode = {
  id: number; url: string; name: string; season: number; number: number | null;
  airdate: string; airtime: string; airstamp: string; summary: string | null;
  image: { original: string } | null;
  _embedded?: { show: Show };
};

const text = (html: string | null | undefined) =>
  (html ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

const channelOf = (s: Show) => s.webChannel?.name ?? s.network?.name ?? null;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: UA });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return (await response.json()) as T;
}

// How many episodes the premiering season has, from the show's own episode
// list - but only when that number is the season's order rather than the
// handful of dates announced so far. TVmaze lists a future season episode by
// episode as the broadcaster confirms them, so a season 38 of The Simpsons
// reads as 2 episodes in September and 22 by the spring. Publishing the
// partial figure would be worse than publishing none, so it is measured
// against what the show's finished seasons ran to, and a first season has to
// look like a real streaming order before it counts.
const MIN_FIRST_SEASON = 6;
const PARTIAL = 0.8;

async function seasonEpisodes(showId: number, season: number): Promise<number | null> {
  try {
    const episodes = await getJson<{ season: number; number: number | null }[]>(`https://api.tvmaze.com/shows/${showId}/episodes`);
    const numbered = episodes.filter((e) => e.number != null);
    const count = numbered.filter((e) => e.season === season).length;
    if (!count) return null;
    const earlier = [...new Set(numbered.filter((e) => e.season < season).map((e) => e.season))]
      .map((s) => numbered.filter((e) => e.season === s).length)
      .sort((a, b) => a - b);
    if (!earlier.length) return count >= MIN_FIRST_SEASON ? count : null;
    const median = earlier[Math.floor(earlier.length / 2)];
    return count >= median * PARTIAL ? count : null;
  } catch {
    return null;
  }
}

function pinBody(e: Episode, show: Show, episodeCount: number | null) {
  const channel = channelOf(show);
  const timed = Boolean(e.airtime);
  const day = new Date(`${e.airdate}T00:00:00.000Z`);
  const title = e.season > 1 ? `${show.name} Season ${e.season} Premieres` : `${show.name} Premieres`;
  const blurb = text(show.summary);
  const opener = text(e.summary);
  return {
    title,
    description: [
      blurb,
      opener && opener !== blurb ? `The premiere, "${e.name}": ${opener}` : null,
      channel ? `Season ${e.season} starts on ${channel}.` : null,
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 3900),
    sourceUrl: e.url,
    allDay: !timed,
    utcStartDateTime: timed ? new Date(e.airstamp).toISOString() : day.toISOString(),
    utcEndDateTime: timed ? null : new Date(day.getTime() + 86_400_000).toISOString(),
    dateConfidence: 'scheduled',
    dateConfidenceReasoning: `TVmaze's forward schedule gives ${e.airdate} as the announced premiere${channel ? ` on ${channel}` : ''}.`,
    company: channel,
    companyWikiUrl: channel && WIKI[channel] ? `https://en.wikipedia.org/wiki/${WIKI[channel]}` : null,
    categories: ['TV'],
    tags: [...new Set([...(show.genres ?? []), channel].filter(Boolean))].slice(0, 8),
    episodeCount,
    episodeStatus: episodeCount ? 'planned' : null,
    media: [e.image?.original, show.image?.original].filter(Boolean).slice(0, 2).map((originalUrl) => ({ type: 1, originalUrl })),
    references: [
      {
        url: show.url,
        title: `${show.name} - TVmaze`,
        confidence: 85,
        publishedDate: null,
        startDate: null,
        endDate: null,
        reasoning: `TVmaze's page for the show, giving its run, status and season list; the premiere episode's own page is the pin's source.`,
      },
    ],
  };
}

async function login(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

// A season answers the season before it, so a show reads as one chain oldest
// first, the way a story series does. Only the immediately preceding season
// counts: threading season 4 under season 1 would claim a link the show does
// not have.
async function parentFor(show: Show, season: number): Promise<number | null> {
  if (season < 2) return null;
  const previous = season - 1 === 1 ? `${show.name} Premieres` : `${show.name} Season ${season - 1} Premieres`;
  const [row] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "title" = $1 AND "utcDeletedDateTime" IS NULL ORDER BY "id" LIMIT 1`, [previous]);
  return row?.id ?? null;
}

async function run() {
  const minWeight = Number(flags['min-weight']);
  const limit = Number(flags.limit);
  const all = await getJson<Episode[]>(FULL_SCHEDULE);
  const candidates = all
    .filter((e) => e.number === 1 && e.season >= 1 && e.airdate)
    .filter((e) => (!flags.from || e.airdate >= flags.from!) && (!flags.to || e.airdate <= flags.to!))
    .map((e) => ({ e, show: e._embedded?.show }))
    .filter((c): c is { e: Episode; show: Show } => Boolean(c.show))
    .filter(({ show }) => show.language === 'English' && KINDS.includes(show.type) && (show.weight ?? 0) >= minWeight)
    .sort((a, b) => (b.show.weight ?? 0) - (a.show.weight ?? 0) || a.e.airdate.localeCompare(b.e.airdate));

  console.log(`${all.length} future episodes, ${candidates.length} season premiere(s) at weight >= ${minWeight}${flags.from ? ` from ${flags.from}` : ''}`);

  const token = flags['dry-run'] ? '' : await login(flags.base!);
  let created = 0;
  let skipped = 0;
  for (const { e, show } of candidates.slice(0, limit)) {
    const [existing] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL LIMIT 1`, [e.url]);
    if (existing) {
      console.log(`  = ${e.airdate} ${show.name} S${e.season} [pin ${existing.id}]`);
      skipped++;
      continue;
    }
    const episodeCount = flags['dry-run'] ? null : await seasonEpisodes(show.id, e.season);
    const parentId = flags['dry-run'] ? null : await parentFor(show, e.season);
    const body = pinBody(e, show, episodeCount);
    console.log(`  + ${e.airdate} ${body.title} (${channelOf(show)}, weight ${show.weight}${episodeCount ? `, ${episodeCount} eps` : ''}${parentId ? `, answers ${parentId}` : ''})`);
    if (flags['dry-run']) continue;
    const response = await fetch(`${flags.base}/api/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, parentId }),
    });
    if (!response.ok) {
      console.error(`    ${response.status}: ${(await response.text()).slice(0, 200)}`);
      continue;
    }
    created++;
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`${created} created, ${skipped} already pinned${flags['dry-run'] ? ' (dry run)' : ''}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
