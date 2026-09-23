import { DEFAULT_DAILY_JOBS, parseDailyJobs, type DailyJobsSetting } from '@/lib/dailyJobs';
import { DEFAULT_MULTILINGUAL, parseMultilingual, type MultilingualSetting } from '@/lib/multilingual';
import { DEFAULT_SLIDER_TYPING, parseSliderTyping, type SliderTypingSetting } from '@/lib/sliderTyping';
import { DEFAULT_TAG_LIST, parseTagList, type TagListSetting } from '@/lib/tagList';
import { DEFAULT_TIMELINE_CONFIDENCE, parseTimelineConfidence, type TimelineConfidenceSetting } from '@/lib/timelineConfidence';
import { DEFAULT_TIMELINE_VIDEO, parseTimelineVideo, type TimelineVideoSetting } from '@/lib/timelineVideo';
import { DEFAULT_PERSONAL_BAG, parsePersonalBag, type PersonalBagSetting } from '@/lib/userWiki';
import * as db from '../db';

const TIMELINE_CONFIDENCE = 'timelineConfidence';
const TIMELINE_VIDEO = 'timelineVideo';
const PERSONAL_BAG = 'personalBag';
const DAILY_JOBS = 'dailyJobs';
const SLIDER_TYPING = 'sliderTyping';
const TAG_LIST = 'tagList';
const MULTILINGUAL = 'multilingual';

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

// Whether the timeline weighs a crowded day's cards by the viewer's preference wiki.
export async function getPersonalBag(): Promise<PersonalBagSetting> {
  const parsed = parsePersonalBag(await read(PERSONAL_BAG));
  return 'setting' in parsed ? parsed.setting : DEFAULT_PERSONAL_BAG;
}

export function setPersonalBag(setting: PersonalBagSetting, userId: number | null) {
  return write(PERSONAL_BAG, setting, userId);
}

// When the daily pin jobs run and what they do (src/server/jobs).
export async function getDailyJobs(): Promise<DailyJobsSetting> {
  const parsed = parseDailyJobs(await read(DAILY_JOBS));
  return 'setting' in parsed ? parsed.setting : DEFAULT_DAILY_JOBS;
}

export function setDailyJobs(setting: DailyJobsSetting, userId: number | null) {
  return write(DAILY_JOBS, setting, userId);
}

// Whether the filter sliders offer a typed box and preset chips under the track.
export async function getSliderTyping(): Promise<SliderTypingSetting> {
  const parsed = parseSliderTyping(await read(SLIDER_TYPING));
  return 'setting' in parsed ? parsed.setting : DEFAULT_SLIDER_TYPING;
}

export function setSliderTyping(setting: SliderTypingSetting, userId: number | null) {
  return write(SLIDER_TYPING, setting, userId);
}

// Whether the tag panel lists its tags or is only the big cloud's button.
export async function getTagList(): Promise<TagListSetting> {
  const parsed = parseTagList(await read(TAG_LIST));
  return 'setting' in parsed ? parsed.setting : DEFAULT_TAG_LIST;
}

export function setTagList(setting: TagListSetting, userId: number | null) {
  return write(TAG_LIST, setting, userId);
}

// Whether the site is offered in its other languages. src/proxy.ts reads it
// through multilingualEnabled() (services/cache.ts), pages through
// multilingualOffered() (services/multilingual.ts); both cache it.
export async function getMultilingual(): Promise<MultilingualSetting> {
  const parsed = parseMultilingual(await read(MULTILINGUAL));
  return 'setting' in parsed ? parsed.setting : DEFAULT_MULTILINGUAL;
}

export function setMultilingual(setting: MultilingualSetting, userId: number | null) {
  return write(MULTILINGUAL, setting, userId);
}
