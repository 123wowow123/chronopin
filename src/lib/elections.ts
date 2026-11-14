// US election results (NBC News, AP data) for the election side panel on a search for "election"
// and the /election/<year> landing page. The figures live in src/server/data/elections.json, built
// by scripts/election/parseNbc.py.

export type ElectionParty = 'D' | 'R' | 'I';
export type ElectionCandidate = { name: string; party: ElectionParty; pct: number };
export type SenateRace = { state: string; special: boolean; flip: boolean; candidates: ElectionCandidate[]; pctIn: number | null; winner: ElectionParty | null };
export type HouseBattleground = { state: string; district: number; winnerParty: ElectionParty; winner: string; winnerPct: number; otherParty: ElectionParty; other: string; otherPct: number };
export type HouseState = { code: string; state: string; seats: number; democrats: number; republicans: number; uncalled: number };

export type ElectionYear = {
  year: number;
  updated: { senate: string; house: string; checked: string };
  // Pins this election's panel and page link to.
  pins: { hub: number; senate: number | null };
  source: { label: string; senateUrl: string; houseUrl: string };
  senate: { democrats: number; republicans: number; independents: number; majority: number; projectedWinner: ElectionParty | null; races: SenateRace[] };
  house: {
    democrats: number;
    republicans: number;
    independents: number;
    majority: number;
    estimate: { democrats: number; republicans: number };
    projectedWinner: ElectionParty | null;
    democraticFlips: number | null;
    democraticNetGain: number | null;
    republicanFlips: number | null;
    battlegrounds: HouseBattleground[];
    states: HouseState[];
  };
};

// The summary a search answers with: the control of each chamber, no race tables.
export type SearchedElection = Pick<ElectionYear, 'year' | 'updated' | 'source' | 'pins'> & {
  senate: Pick<ElectionYear['senate'], 'democrats' | 'republicans' | 'independents' | 'majority' | 'projectedWinner'> & { flips: number; uncalled: number };
  house: Pick<ElectionYear['house'], 'democrats' | 'republicans' | 'independents' | 'majority' | 'projectedWinner' | 'estimate'> & { uncalled: number };
};

export const PARTY_TONE: Record<ElectionParty, string> = { D: 'bg-blue-600', R: 'bg-red-600', I: 'bg-zinc-500' };

export const electionPath = (year: number) => `/election/${year}`;

// A search names an election by the word alone ("election", "elections 2026", "2026 election
// results"). A year in the text picks that year's panel; none picks the newest.
export function electionSearchYear(text: string, years: readonly number[]): number | null {
  if (!/\belections?\b/i.test(text) || !years.length) return null;
  const named = text.match(/\b(19|20)\d{2}\b/g)?.map(Number);
  if (named?.length) return years.find((y) => named.includes(y)) ?? null;
  return Math.max(...years);
}

export function summarize(e: ElectionYear): SearchedElection {
  return {
    year: e.year,
    updated: e.updated,
    source: e.source,
    pins: e.pins,
    senate: {
      democrats: e.senate.democrats,
      republicans: e.senate.republicans,
      independents: e.senate.independents,
      majority: e.senate.majority,
      projectedWinner: e.senate.projectedWinner,
      flips: e.senate.races.filter((r) => r.flip).length,
      uncalled: e.senate.races.filter((r) => !r.winner).length,
    },
    house: {
      democrats: e.house.democrats,
      republicans: e.house.republicans,
      independents: e.house.independents,
      majority: e.house.majority,
      projectedWinner: e.house.projectedWinner,
      estimate: e.house.estimate,
      uncalled: e.house.states.reduce((n, s) => n + s.uncalled, 0),
    },
  };
}
