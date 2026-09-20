// What the world is searching for today, as pin candidates, from Google
// Trends' daily RSS (trends.google.com/trending/rss, free, no key).
//
// This job does NOT post pins, and that is deliberate. Every other job in the
// roster reads a calendar - a fixture list, a launch manifest, a trial
// registry - and a calendar row already is a dated event. A trending search
// term is not an event: it is a crowd looking at something, and on a Sunday in
// the NFL season nine of the ten US terms are that afternoon's games. Measured
// across six geos on 2026-09-20, about 85% of terms were same-day sport,
// lottery numbers, weather or a celebrity's name with no dated event behind
// it at all.
//
// What survives the filter is worth a look, because it is the one source here
// that finds a subject nobody thought to schedule: a car unveiled this
// morning, a policy that takes effect next year, a sequel that just got a
// date. So the job's output is a ranked candidate list with each term's news
// links, for a session to scrape through the normal pipeline.
//
//   npm run trends:discover
//   npm run trends:discover -- --geo US,GB,JP      pick the geographies
//   npm run trends:discover -- --all               skip the noise filter
//   npm run trends:discover -- --json              machine-readable output

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    geo: { type: 'string', default: 'US,GB,JP,DE,IN,BR,AU,CA,FR,KR' },
    all: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    'min-traffic': { type: 'string', default: '0' },
  },
});

type NewsItem = { title: string; url: string; source: string };
type Trend = { geo: string; term: string; traffic: number; picture: string | null; news: NewsItem[] };

// A trending term earns a place on the shortlist by pointing at something
// dated - a release, an opening, a ruling, a launch. These are the words that
// say so, and a headline carrying one is evidence the crowd is looking at an
// event rather than at a scoreboard.
const EVENT_HINTS = [
  /\b(releases?|released|launch(es|ed|ing)?|unveil(s|ed|ing)?|announce(s|d|ment)?|reveal(s|ed))\b/i,
  /\b(premieres?|debuts?|arrives?|opens?|opening|begins?|returns?)\b/i,
  /\b(set (for|to)|due (in|on|to)|scheduled|slated|coming (to|in)|goes on sale|on sale)\b/i,
  /\b(approved?|approval|ruling|ruled|signed into law|takes effect|deadline|ban(s|ned)?)\b/i,
  /\b(trailer|first look|pre-?order|price[ds]?|sequel|season \d+)\b/i,
  /\b(merger|acquisition|acquires?|ipo|files? for|contract|deal worth|wins? \S+ contract)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b20(2[6-9]|[3-9]\d)\b/,
];

// The counterweight: live coverage of something happening right now. Scores,
// previews, "how to watch", a lottery draw, a weather lookup.
const NOISE = [
  /\b(vs\.?|v)\b/i,
  /\bhow to watch\b|\bwhere to watch\b|\bonde assistir\b|\bne zaman\b/i,
  /\blive (stream|blog|ticker|updates?|score|commentary)/i,
  /\b(direct|liveblog|en direct)\b/i,
  /\b(score|scores|scoreboard|standings|results?|recap|highlights|full time|game blog)\b/i,
  /\b(prediction|predictions|odds|picks?|betting|preview|start or sit|fantasy|contention)\b/i,
  /\b(lottery|lotto|mega.?sena|powerball|jackpot|quina)\b/i,
  /\b(weather|forecast|hurricane track)\b/i,
  /\b(match report|game recap|resumen|escala(ç|c)(õ|o)es|compositions|muhtemel)\b/i,
  /\b(week \d+|matchday|gameweek|journ(é|e)e|jornada)\b/i,
  /\b\d+\s*-\s*\d+\b/,
];

// Terms that are never the event: a bare club, league, broadcaster or a
// standing results page.
const NOISE_TERMS = [
  /\b(nfl|nba|mlb|nhl|epl|laliga|liga|serie a|bundesliga|ligue ?1|brasileirao|premier league|champions league)\b/i,
  /\b(espn|cbs sports|fox sports|sky sports|bild|rtl|bbc sport|globo)\b/i,
  /\b(scores?|schedule|tabela|calendario|standings|classement)\b/i,
  /^(stock market today|weather forecast today)$/i,
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>(.*?)</${name}>`, 's'));
  return m ? decode(m[1]) : null;
}

// "20000+" -> 20000, so the list can be ranked and thin terms dropped.
function traffic(block: string): number {
  const raw = tag(block, 'ht:approx_traffic');
  return raw ? Number(raw.replace(/[^\d]/g, '')) || 0 : 0;
}

async function fetchGeo(geo: string): Promise<Trend[]> {
  const response = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' },
  });
  if (!response.ok) {
    console.error(`  ${geo}: ${response.status}`);
    return [];
  }
  const xml = await response.text();
  return [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map(([, block]) => ({
    geo,
    term: tag(block, 'title') ?? '',
    traffic: traffic(block),
    picture: tag(block, 'ht:picture'),
    news: [...block.matchAll(/<ht:news_item>(.*?)<\/ht:news_item>/gs)].map(([, n]) => ({
      title: tag(n, 'ht:news_item_title') ?? '',
      url: tag(n, 'ht:news_item_url') ?? '',
      source: tag(n, 'ht:news_item_source') ?? '',
    })),
  })).filter((t) => t.term);
}

// Net evidence that this term is about a dated event: headlines that talk
// like a schedule, less headlines that talk like a live broadcast. A term
// needs at least one real signal and more signal than noise to survive.
function eventScore(trend: Trend): number {
  if (NOISE_TERMS.some((re) => re.test(trend.term))) return -99;
  let score = 0;
  for (const n of trend.news) {
    if (EVENT_HINTS.some((re) => re.test(n.title))) score += 1;
    if (NOISE.some((re) => re.test(n.title))) score -= 1;
  }
  return score;
}

// A term is already covered when a live pin's title carries it as whole
// words, or when one of its news URLs is already a pin's source. Both are
// cheap and neither is exact - this is a shortlist for a session, not the
// duplicate check. The word boundaries matter: a plain ILIKE '%epic%' claimed
// the Saudi pipemaker EPIC was already pinned because some other pin's title
// contains "epic".
async function alreadyCovered(trend: Trend): Promise<number | null> {
  // A search term is typed without punctuation ("spider man brand new day")
  // and a title is full of it ("Spider-Man: Brand New Day"), so the words are
  // matched with anything between them. Without that the film read as unpinned
  // when it was already pin 392.
  const words = trend.term.split(/[^a-z0-9]+/i).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return null;
  const [byTitle] = await db.query<{ id: number }>(
    `SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "title" ~* $1 LIMIT 1`,
    [`\\m${words.join('[^a-z0-9]+')}\\M`],
  );
  if (byTitle) return byTitle.id;
  const urls = trend.news.map((n) => n.url).filter(Boolean);
  if (!urls.length) return null;
  const [bySource] = await db.query<{ id: number }>(
    `SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "sourceUrl" = ANY($1::text[]) LIMIT 1`,
    [urls],
  );
  return bySource?.id ?? null;
}

async function run() {
  const geos = flags.geo!.split(',').map((g) => g.trim()).filter(Boolean);
  const floor = Number(flags['min-traffic']);
  const all: Trend[] = [];
  for (const geo of geos) all.push(...(await fetchGeo(geo)));
  console.log(`${all.length} trending terms across ${geos.length} geographies`);

  const scored = all.map((t) => ({ ...t, score: eventScore(t) }));
  const kept = scored.filter((t) => t.traffic >= floor && (flags.all || t.score > 0));
  // The same story trends in several countries (one Champions League night
  // reaches five feeds); keep the geo with the most search traffic behind it.
  const byTerm = new Map<string, Trend & { score: number }>();
  for (const t of [...kept].sort((a, b) => b.traffic - a.traffic)) {
    const key = t.term.toLowerCase();
    if (!byTerm.has(key)) byTerm.set(key, t);
  }
  const candidates = [...byTerm.values()].sort((a, b) => b.score - a.score || b.traffic - a.traffic);
  console.log(`${candidates.length} survive the filter (${all.length - kept.length} dropped as same-day noise)\n`);

  const out = [];
  for (const t of candidates) {
    const covered = await alreadyCovered(t);
    out.push({ ...t, coveredByPin: covered });
    if (flags.json) continue;
    console.log(`${String(t.traffic).padStart(7)} +${t.score}  [${t.geo}] ${t.term}${covered ? `  — already pin ${covered}` : ''}`);
    for (const n of t.news.slice(0, 3)) console.log(`         ${n.source}: ${n.title.slice(0, 90)}\n         ${n.url}`);
    console.log();
  }
  if (flags.json) console.log(JSON.stringify(out, null, 2));
  const fresh = out.filter((t) => !t.coveredByPin).length;
  console.log(`${fresh} candidate(s) not already covered by a pin`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
