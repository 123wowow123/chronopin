import { cacheLife, cacheTag } from 'next/cache';
import { icsCalendar } from '@/lib/ics';
import { absoluteUrl } from '@/lib/seo';
import { siteName } from '@/lib/appConfig';
import { topicSlug } from '@/lib/topics';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '../db';
import Person from '../model/person';
import Pins from '../model/pins';
import Topics from '../model/topics';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { topicIndex } from './topics';

// Public .ics feeds for a tag, company, person or thread. A feed carries the
// subject's pins from a month back to the next MAX events, in the default
// language (a calendar is subscribed to once; the pin link opens in the
// reader's own).
export const CALENDAR_KINDS = ['tag', 'company', 'person', 'thread'] as const;
export type CalendarKind = (typeof CALENDAR_KINDS)[number];

const MAX = 500;
const LOOKBACK_MS = 30 * 86_400_000;

async function pinsOf(ids: number[], from: Date): Promise<PinJson[]> {
  if (!ids.length) return [];
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(ids)).pins);
  return loaded
    .filter((p) => new Date(p.utcEndDateTime ?? p.utcStartDateTime) >= from)
    .sort((a, b) => a.utcStartDateTime.localeCompare(b.utcStartDateTime) || a.id - b.id)
    .slice(0, MAX);
}

export async function calendarFeed(kind: CalendarKind, key: string): Promise<string | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.people);
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_MS);
  const min = await timelineMinConfidence();
  let name: string;
  let ids: number[];
  let page: string;
  if (kind === 'tag' || kind === 'company') {
    const index = await topicIndex();
    const slug = topicSlug(key);
    if (kind === 'tag') {
      const tag = index.tags.find((t) => t.slug === slug);
      if (!tag) return null;
      const r = await Topics.tagPinIds(tag.name, from, { upcoming: MAX, past: 0 }, min);
      [name, ids, page] = [tag.name, r.upcomingIds, `/tag/${encodeURIComponent(slug)}`];
    } else {
      const company = index.companies.find((c) => c.slug === slug);
      if (!company) return null;
      const r = await Topics.companyPinIds(company.id, from, { upcoming: MAX, past: 0 }, min);
      [name, ids, page] = [company.name, r.upcomingIds, `/company/${encodeURIComponent(slug)}`];
    }
  } else if (kind === 'person') {
    const id = await Person.idBySlug(key);
    if (id == null) return null;
    const rows = await db.query<{ name: string }>(`SELECT "name" FROM "Person" WHERE "id" = $1`, [id]);
    [name, ids, page] = [rows[0]?.name ?? key, await Person.pinIds(id, 1000), `/person/${encodeURIComponent(key)}`];
  } else {
    const pinId = Number(key);
    if (!Number.isInteger(pinId) || pinId < 1) return null;
    ids = await Pins.threadIds(pinId);
    if (!ids.length) return null;
    const top = toJson<PinJson[]>((await Pins.queryByIds([ids[0]])).pins)[0];
    [name, page] = [`${top?.title ?? `Thread ${pinId}`}`, `/pin/${pinId}`];
  }
  const pins = await pinsOf(ids, from);
  return icsCalendar(`${name} · ${siteName}`, `Upcoming dates for ${name} from ${siteName}: ${absoluteUrl(page)}`, pins, now);
}
