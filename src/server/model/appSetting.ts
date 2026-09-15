import { DEFAULT_TIMELINE_CONFIDENCE, parseTimelineConfidence, type TimelineConfidenceSetting } from '@/lib/timelineConfidence';
import * as db from '../db';

const TIMELINE_CONFIDENCE = 'timelineConfidence';

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
