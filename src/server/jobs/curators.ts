import * as db from '../db';

// The curator accounts a daily job may post and edit as, one per vertical,
// so every job pin is attributable to its desk
// (docs/okf/scraping/strategy.md#principles). A job acts as a curator by a
// token the server signs for it (./pinApi.ts), never by its password, and
// never as a person: a pin by anyone else is marked for revisiting instead of
// edited.
//
// EVERY desk account that exists on prod must be listed here, or the job tools
// refuse it (create_pin has no such curator) and agents wrongly report that it
// does not exist (@CityDesk, 2026-11-14). When you create a desk, add it here
// in the same change, and run `python3 scripts/jobs/curators_diff.py` to list
// prod desks that are missing.
export const CURATORS: Record<string, string> = {
  '@AnimeDesk': 'anime series, seasons and films',
  '@FilmDesk': 'film and TV releases and premieres',
  '@GameDesk': 'video games',
  '@TechDesk': 'technology, software, devices, stocks',
  '@AIDesk': 'artificial intelligence: AI models, labs, products, policy',
  '@DataCenterDesk': 'AI and cloud data center campuses, clusters and capacity',
  '@PolicyDesk': 'technology and data center legislation and regulation',
  '@ChipDesk': 'semiconductors, chipmakers and computing hardware',
  '@EnterpriseDesk': 'enterprise software and cloud vendors: results, products, conferences',
  '@TelecomDesk': 'telecom operators: results, networks, deals',
  '@RoboticsDesk': 'robots and humanoids: reveals, factories, funding, listings',
  '@DeviceDesk': 'consumer devices and gadgets: launches, sales, CES awards',
  '@BuildDesk': 'buildings, infrastructure, transport projects, space launches',
  '@OddsDesk': 'prediction markets (Kalshi, Polymarket)',
  '@MotorDesk': 'cars and motoring: launches, EV and gas performance, racing machinery',
  '@SneakerDesk': 'sneaker and apparel drops',
  '@MarketDesk': 'financial markets',
  '@ScienceDesk': 'science, research, prizes, astronomy',
  '@HealthDesk': 'health, medicine, drug approvals, trials',
  '@SportDesk': 'sport fixtures, tournaments and finals',
  '@MusicDesk': 'concert tours, festivals and record releases',
  '@PoliticsDesk': 'elections and referendums',
  '@ClimateDesk': 'climate summits and environment milestones',
  '@EconDesk': 'central banks, macro releases, budgets and shutdowns',
  '@CityDesk': 'city events and civic news for any city: parades, civic festivals, city hall, budgets, ballot measures, transit and local policy',
  '@ConsumerDesk': 'consumer-goods companies (packaged food, drinks, household and personal care): results, leadership, deals',
  '@AgriDesk': 'agribusiness: plantations, oilseed crushing, sugar and grain processors, commodity traders',
  '@FashionDesk': 'fashion and apparel brands: funding, leadership, collaborations, launches, campaigns',
  '@WomenDesk': "women's rights and policy, women-in-business milestones that no event desk owns",
  '@LuxuryDesk': 'luxury houses and groups, watches, jewellery, luxury autos and hotels, auction houses',
  '@DefenseDesk': 'military and defence: operations, ceasefires, weapons programmes, budgets, alliance summits, contractors',
  '@DropDesk': 'limited product drops: streetwear, designer collabs, trading cards, collectible toys, bottle releases, merch',
  '@DrinksDesk': 'alcoholic drinks: brewers, winemakers and distillers, plant closures, festivals and fairs',
  '@FishingDesk': 'fishing: fisheries, quotas, seafood companies, seafood expos, sport fishing tournaments',
  '@ShowDesk': 'trade shows, conventions and expos (motor shows, boat shows, aviation shows)',
  '@ArtDesk': 'museum and gallery exhibitions and art events',
  '@JapanGameDesk': 'Japanese toys, hobby kits, tabletop and card games and their tournaments',
  '@PokemonDesk': 'Pokemon events: Play! Pokemon championships, Pokemon GO events, game releases',
  '@BoardGameDesk': 'tabletop and board games: fairs, conventions and game releases',
  '@ComicsDesk': 'comics and manga: launches, endings, creator announcements',
  '@RacingDesk': 'motorsport races and results: Indy 500, Le Mans and other racing events',
  '@SnackDesk': 'snacks, confectionery and ice cream: product launches and seasonal releases',
  '@RecordDesk': 'records and all-time highs: sale records, world records, record IPOs and prices',
  '@TaiwanDesk': 'Taiwan news and events',
  '@ChinaDesk': 'China news and events',
  '@BankDesk': 'banking and finance: results days, M&A, regulation, IPOs',
  '@TravelDesk': 'travel: airlines, airports, cruise, seasonal activities, entry rules',
  '@DesignDesk': 'industrial and product design: designers, exhibitions, milestones',
  '@FaithDesk':'religious observances and pilgrimages',
  '@FoodDesk': 'restaurants: openings, ratings and reviews',
  '@CyberDesk': 'cybersecurity: breaches, end-of-support and compliance deadlines',
  '@LawDesk': 'courts and crime: trials, verdicts, rulings',
  '@RetailDesk': 'retail: store openings, closures, e-commerce',
  '@EnergyDesk': 'energy: reserves, power plants, pipelines',
  '@QuakeDesk': 'earthquakes (USGS significant feed), tropical cyclones (NASA EONET), floods (GDACS)',
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
