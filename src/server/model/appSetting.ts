import { DEFAULT_TIMELINE_CONFIDENCE, parseTimelineConfidence, type TimelineConfidenceSetting } from '@/lib/timelineConfidence';
import { DEFAULT_TIMELINE_VIDEO, parseTimelineVideo, type TimelineVideoSetting } from '@/lib/timelineVideo';
import { DEFAULT_PERSONAL_BAG, parsePersonalBag, type PersonalBagSetting } from '@/lib/userWiki';
import { DEFAULT_WIKI_RECHECK, parseWikiRecheck, type WikiRecheckSetting } from '@/lib/wikiRecheck';
import * as db from '../db';

const TIMELINE_CONFIDENCE = 'timelineConfidence';
const TIMELINE_VIDEO = 'timelineVideo';
const WIKI_RECHECK = 'wikiRecheck';
const PERSONAL_BAG = 'personalBag';

async function read(key: string): Promise<unknown> {
  const rows = await db.query(`SELECT "value" FROM "AppSetting" WHERE "key" = $1`, [key]);
  return rows[0]?.value;
}

async function write(key: string, value: unknown, userId: number | null) {
  await db.query(
    `
    INSERT INTO "AppSetting" ("key", "value", "userId", "utcUpdatedDateTime")
    VALUES ($1, $2::jsonb, $3, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "userId" = EXCLUDED."userId", "utcUpdatedDateTime" = now()`,
    [key, JSON.stringify(value), userId],
  );
}

// The saved setting, or the default when none (or an unreadable one) is stored.
export async function getTimelineConfidence(): Promise<TimelineConfidenceSetting> {
  const parsed = parseTimelineConfidence(await read(TIMELINE_CONFIDENCE));
  return 'setting' in parsed ? parsed.setting : DEFAULT_TIMELINE_CONFIDENCE;
}

export function setTimelineConfidence(setting: TimelineConfidenceSetting, userId: number | null) {
  return write(TIMELINE_CONFIDENCE, setting, userId);
}

// Whether a timeline card plays video on a phone.
export async function getTimelineVideo(): Promise<TimelineVideoSetting> {
  const parsed = parseTimelineVideo(await read(TIMELINE_VIDEO));
  return 'setting' in parsed ? parsed.setting : DEFAULT_TIMELINE_VIDEO;
}

export function setTimelineVideo(setting: TimelineVideoSetting, userId: number | null) {
  return write(TIMELINE_VIDEO, setting, userId);
}

// When okf:lint reads links again to see whether their wikis are stale.
export async function getWikiRecheck(): Promise<WikiRecheckSetting> {
  const parsed = parseWikiRecheck(await read(WIKI_RECHECK));
  return 'setting' in parsed ? parsed.setting : DEFAULT_WIKI_RECHECK;
}

export function setWikiRecheck(setting: WikiRecheckSetting, userId: number | null) {
  return write(WIKI_RECHECK, setting, userId);
}

// Whether the timeline weighs a crowded day's cards by the viewer's preference wiki.
export async function getPersonalBag(): Promise<PersonalBagSetting> {
  const parsed = parsePersonalBag(await read(PERSONAL_BAG));
  return 'setting' in parsed ? parsed.setting : DEFAULT_PERSONAL_BAG;
}

export function setPersonalBag(setting: PersonalBagSetting, userId: number | null) {
  return write(PERSONAL_BAG, setting, userId);
}

const WIKI_RECHECK_LAST_RUN = 'wikiRecheckLastRun';

// Claims the nightly re-read for a UTC day ("YYYY-MM-DD"): true for exactly
// one caller per day, however many servers try, so it runs once.
export async function claimWikiRecheckRun(day: string): Promise<boolean> {
  const rows = await db.query(
    `
    INSERT INTO "AppSetting" ("key", "value", "userId", "utcUpdatedDateTime")
    VALUES ($1, to_jsonb($2::text), NULL, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "utcUpdatedDateTime" = now()
      WHERE "AppSetting"."value" #>> '{}' < $2
    RETURNING "key"`,
    [WIKI_RECHECK_LAST_RUN, day],
  );
  return rows.length > 0;
}

// When the nightly re-read last ran, for the admin page; null before the first.
export async function getWikiRecheckLastRun(): Promise<string | null> {
  const rows = await db.query<{ utcUpdatedDateTime: Date }>(`SELECT "utcUpdatedDateTime" FROM "AppSetting" WHERE "key" = $1`, [WIKI_RECHECK_LAST_RUN]);
  return rows[0] ? new Date(rows[0].utcUpdatedDateTime).toISOString() : null;
}
