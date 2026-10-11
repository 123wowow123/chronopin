// Data for the /person and /people pages (src/lib/people.ts),
// cached with Cache Components like the company pages in ./topics.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Pins from '../model/pins';
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
export type PersonEntry = PersonSummary & { pins: number; radar?: (number | null)[][] };

// Everyone with a page, the executive first, then by office and name.
export async function personIndex(): Promise<PersonEntry[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.people, TAGS.sitemap);
  const [people, counts, radars] = await Promise.all([Person.list(), Person.pinCounts(), Person.radars()]);
  return people.map((p) => ({ ...p, pins: counts.get(p.id) ?? 0, ...(radars.has(p.id) ? { radar: radars.get(p.id) } : {}) }));
}

// The page renders the wiki compiled from the sourced facts (0151), not the
// fact tables: what it states is what the wiki's references back.
export type PersonPage = { profile: CompiledPerson; pins: PinJson[] };

export async function personPage(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<PersonPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.people, TAGS.timeline);
  const id = await Person.idBySlug(slug);
  if (id == null) return null;
  const [profile, pinIds] = await Promise.all([PersonWiki.compiled(id), Person.pinIds(id, PINS)]);
  if (!profile) return null;
  const loaded = pinIds.length ? toJson<PinJson[]>((await Pins.queryByIds(pinIds)).pins) : [];
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const pins = pinIds.map((pinId) => byId.get(pinId)).filter((p): p is PinJson => !!p);
  await localizePins(pins, locale);
  return { profile, pins };
}

export { topicSlug };
