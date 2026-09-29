import * as db from '../db';

// The curator accounts a daily job may post and edit as, one per vertical,
// so every job pin is attributable to its desk
// (docs/okf/scraping/strategy.md#principles). A job acts as a curator by a
// token the server signs for it (./pinApi.ts), never by its password, and
// never as a person: a pin by anyone else is marked for revisiting instead of
// edited.
export const CURATORS: Record<string, string> = {
  '@AnimeDesk': 'anime series, seasons and films',
  '@FilmDesk': 'film and TV releases and premieres',
  '@GameDesk': 'video games',
  '@TechDesk': 'technology, AI models, software, devices, stocks',
  '@BuildDesk': 'buildings, infrastructure, transport projects, space launches',
  '@OddsDesk': 'prediction markets (Kalshi, Polymarket)',
  '@SneakerDesk': 'sneaker and apparel drops',
  '@MarketDesk': 'financial markets',
  '@ScienceDesk': 'science, research, prizes, astronomy',
  '@HealthDesk': 'health, medicine, drug approvals, trials',
  '@SportDesk': 'sport fixtures, tournaments and finals',
  '@MusicDesk': 'concert tours, festivals and record releases',
  '@PoliticsDesk': 'elections and referendums',
  '@ClimateDesk': 'climate summits and environment milestones',
  '@EconDesk': 'central banks, macro releases, budgets and shutdowns',
  '@FaithDesk': 'religious observances and pilgrimages',
  '@FoodDesk': 'restaurants: openings, ratings and reviews',
  '@CyberDesk': 'cybersecurity: breaches, end-of-support and compliance deadlines',
  '@LawDesk': 'courts and crime: trials, verdicts, rulings',
  '@RetailDesk': 'retail: store openings, closures, e-commerce',
  '@EnergyDesk': 'energy: reserves, power plants, pipelines',
};

const bare = (handle: string) => handle.trim().replace(/^@/, '').toLowerCase();

export function isCurator(handle: string | null | undefined): boolean {
  return !!handle && Object.keys(CURATORS).some((h) => bare(h) === bare(handle));
}

// The curator's user id, or null for a handle that is not a curator or has no
// account here (a fresh database may not have them all).
export async function curatorId(handle: string): Promise<number | null> {
  if (!isCurator(handle)) return null;
  const rows = await db.query<{ id: number }>(
    `SELECT "id" FROM "User" WHERE lower(ltrim("userName"::text, '@')) = $1 AND "utcDeletedDateTime" IS NULL LIMIT 1`,
    [bare(handle)],
  );
  return rows[0]?.id ?? null;
}
