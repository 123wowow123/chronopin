// Data for the /person and /people pages (src/lib/people.ts),
// cached with Cache Components like the company pages in ./topics.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Pins from '../model/pins';
import PersonCampaign from '../model/personCampaign';
import type { CampaignCycle } from '@/lib/campaigns';
import PersonCommittee from '../model/personCommittee';
import PersonTrade from '../model/personTrade';
import PersonHoldings from '../model/personHoldings';
import type { HoldingsSnapshot } from '@/lib/holdings';
import type { Seat } from '@/lib/conflicts';
import type { TradeRow, TradeSummary } from '@/lib/trades';
import Person from '../model/person';
import PersonWiki from '../model/personWiki';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import type { PersonSummary } from '@/lib/people';
import type { CompiledPerson } from '@/lib/personWiki';
import { topicSlug } from '@/lib/topics';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { localizePins } from './translations';

const PINS = 24;

// radar: the person's life phases as eight scores each, for the card's mini radar.
export type PersonEntry = PersonSummary & { pins: number; trades: number; radar?: (number | null)[][] };

// Everyone with a page, the executive first, then by office and name.
export async function personIndex(): Promise<PersonEntry[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.people, TAGS.sitemap);
  const [people, counts, radars, trades] = await Promise.all([Person.list(), Person.pinCounts(), Person.radars(), PersonTrade.counts()]);
  return people.map((p) => ({ ...p, pins: counts.get(p.id) ?? 0, trades: trades.get(p.id) ?? 0, ...(radars.has(p.id) ? { radar: radars.get(p.id) } : {}) }));
}

// The page renders the wiki compiled from the sourced facts (0151), not the
// fact tables: what it states is what the wiki's references back.
// The newest trades in the page itself; the rest load on demand (the "More" button).
export const TRADES_SHOWN = 25;

export type PersonPage = { profile: CompiledPerson; pins: PinJson[]; trades: TradeRow[]; tradeSummary: TradeSummary; committees: Seat[]; campaigns: CampaignCycle[]; holdings: HoldingsSnapshot[] };

export async function personPage(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<PersonPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.people, TAGS.timeline);
  const id = await Person.idBySlug(slug);
  if (id == null) return null;
  const [profile, pinIds, trades, tradeSummary, committees, campaigns] = await Promise.all([PersonWiki.compiled(id), Person.pinIds(id, PINS), PersonTrade.preview(id, TRADES_SHOWN), PersonTrade.summary(id), PersonCommittee.forPerson(id), PersonCampaign.forPerson(id)]);
  if (!profile) return null;
  const holdings = await PersonHoldings.forPerson(id, profile.name);
  const loaded = pinIds.length ? toJson<PinJson[]>((await Pins.queryByIds(pinIds)).pins) : [];
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const pins = pinIds.map((pinId) => byId.get(pinId)).filter((p): p is PinJson => !!p);
  await localizePins(pins, locale);
  return { profile, pins, trades, tradeSummary, committees, campaigns, holdings };
}

export { topicSlug };
