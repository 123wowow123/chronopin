// Data for server-rendered pages, cached with Cache Components. Every function
// here returns plain JSON (no model instances), keyed by its arguments. Those
// that return pins take the page's language, and swap in the pins'
// translations (services/translations.ts); English, the default, is the pins'
// own words.

import { cacheLife, cacheTag } from 'next/cache';
import { getPersonalBag, getSliderTyping, getTagList, getTimelineVideo } from '../model/appSetting';
import Favorite from '../model/favorite';
import Pin from '../model/pin';
import Pins from '../model/pins';
import PinView from '../model/pinView';
import { SearchPins } from '../model/searchPin';
import UserWiki from '../model/userWiki';
import { compareDuplicateRank } from '@/lib/duplicates';
import { toJson, type NewPin, type PinJson, type SearchPage, type TimelinePage, type TrendingPin } from '@/lib/types';
import type { SliderTypingSetting } from '@/lib/sliderTyping';
import type { TagListSetting } from '@/lib/tagList';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { UserPreference } from '@/lib/userWiki';
import { TAGS } from './cache';
import { readSearchRequest, searchPinsPage, searchTagCounts, type SearchSort } from './search';
import type { TagCount } from '@/lib/tags';
import { getTimeline, timelineMinConfidence } from './timeline';
import { resolveCreatedSince, type CreatedQuery } from '../util/createdFilter';
import { dependsOnZone, joinSearchQuery, parseSearchQuery, splitSearchQuery } from '../util/searchQuery';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { localizePins } from './translations';
import { loadNewPins } from './newPins';

// The video setting the cards on a page of pins read. Cached (and expired)
// with those pages rather than read per request: it is one row that changes
// about never.
export async function timelineVideo(): Promise<TimelineVideoSetting> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return getTimelineVideo();
}

// Whether the filter sliders offer a typed box, cached and expired the same way.
export async function sliderTyping(): Promise<SliderTypingSetting> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return getSliderTyping();
}

// Whether the tag panel lists its tags, cached and expired the same way.
export async function tagList(): Promise<TagListSetting> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return getTagList();
}

// The signed-in viewer's preference wiki, which a crowded day's cards are
// weighed by; null when signed out, before their first build, or with the
// admin setting off. Per user, so read per request rather than cached.
export async function viewerPreference(userId: number | undefined): Promise<UserPreference | null> {
  if (!userId || !(await getPersonalBag()).enabled) return null;
  return UserWiki.preference(userId);
}

// The trending panel's sliding window: views over the last 3 UTC days (today
// included) against the 3 days before them, both moving on a day each midnight.
export const TRENDING_DAYS = 3;

// The most viewed pins with views on the rise. Views are recorded without
// expiring anything, so this simply goes stale for a few minutes at a time.
export async function trendingPins(locale: Locale = DEFAULT_LOCALE): Promise<TrendingPin[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return localizePins(await PinView.trending(TRENDING_DAYS, 5, await timelineMinConfidence()), locale);
}

// The pins added most recently. A new pin expires the timeline tag, so this
// refreshes as pins are added rather than on a timer alone.
export async function newPins(locale: Locale = DEFAULT_LOCALE): Promise<NewPin[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return loadNewPins(locale);
}

// around opens the first page on a pin instead of now (the pin page's "To
// timeline").
export type TimelineCursor = { fromDateTime?: string | null; lastPinId?: number; around?: { dateTime: string; pinId: number } | null };

// hasFavorite and hasLike are the only per-viewer fields a pin carries, and
// they are the reason a cached page used to be keyed by reader: every signed
// in person got a private copy of every cursor, to be told about the handful
// of pins they watch. The cached pages below are built with no viewer and
// drop the fields rather than answer them as false, so a card knows to ask
// (src/lib/client/watched.ts) instead of believing a shared page's no.
const NO_VIEWER = 0;

function withoutViewerState<T extends { pins: PinJson[] }>(page: T): T {
  page.pins.forEach((pin) => {
    delete pin.hasFavorite;
    delete pin.hasLike;
  });
  return page;
}

// A timeline page, plus the cursors for the pages either side of it and the
// confidence bar it was filtered by (null when the filter is off).
export async function timelinePage(
  cursor: TimelineCursor,
  createdWithin: string | null,
  locale: Locale = DEFAULT_LOCALE,
): Promise<TimelinePage & { links: { previous?: string; next?: string }; minConfidence: number | null }> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);

  const createdSince = createdWithin ? resolveCreatedSince({ created_within: createdWithin }) : null;
  const [pins, minConfidence] = await Promise.all([
    getTimeline({
      userId: NO_VIEWER,
      fromDateTime: cursor.fromDateTime,
      around: cursor.around,
      lastPinId: cursor.lastPinId,
      createdSince,
    }),
    timelineMinConfidence(),
  ]);
  const range = pins.minMaxDateTimePin();
  const carry = createdSince ? `&created_since=${encodeURIComponent(createdSince.toISOString())}` : '';
  const links = range
    ? {
        previous: `?from_date_time=-${new Date(range.min.utcStartDateTime).toISOString()}&last_pin_id=${range.min.id}${carry}`,
        next: `?from_date_time=${new Date(range.max.utcStartDateTime).toISOString()}&last_pin_id=${range.max.id}${carry}`,
      }
    : {};
  const page = withoutViewerState({ ...toJson<TimelinePage>(pins), links, minConfidence });
  await localizePins(page.pins, locale);
  return page;
}

// One pin as its page shows it (no per-viewer fields). In English it is the
// pin as stored, which is also what the edit form must start from.
export async function pinById(id: number, locale: Locale = DEFAULT_LOCALE): Promise<PinJson | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const { pin } = await Pin.queryById(id);
  if (!pin) return null;
  const [json] = await localizePins([toJson<PinJson>(pin)], locale);
  return json;
}

// Tagged with every pin in the thread, so a change to any of them - a
// response posted or moved (its parent's tag is invalidated too) - redraws it.
export async function threadPins(id: number, locale: Locale = DEFAULT_LOCALE): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  const pins = toJson<PinJson[]>((await Pins.getThreadPins(id)).pins);
  cacheTag(TAGS.pin(id), ...pins.map((p) => TAGS.pin(p.id)));
  return localizePins(pins, locale);
}

// The pins in a pin's confirmed duplicate group, itself included, best ranked
// first. Every member's tag is invalidated when the group changes.
export async function duplicateGroupPins(id: number, group: number[], locale: Locale = DEFAULT_LOCALE): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const pins = toJson<PinJson[]>((await Pins.queryByIds(group)).pins);
  return localizePins(pins.sort(compareDuplicateRank), locale);
}

// Pins like this one, by semantic search on its title. The search service
// being down just means no suggestions.
// title: the pin's own, English one, which is what the search index holds.
export async function relatedPins(id: number, title: string, locale: Locale = DEFAULT_LOCALE): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  try {
    const pins = await SearchPins.search(title);
    // The service ranks the hits, but the pins themselves are loaded in date
    // order, so sort by score before the top dozen are taken - otherwise the
    // closest matches were as likely to be cut as shown, and the ones that
    // survived read as an arbitrary run of dates.
    const related = pins.pins.filter((p) => p.id !== id).sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0));
    return localizePins(toJson<PinJson[]>(related).slice(0, 12), locale);
  } catch {
    return [];
  }
}

// The sort and filters a search page's URL names: spans as the sliders set them.
// timeZone: the viewer's, for a query whose days depend on it (date:,
// posted:), else UTC so every zone shares the cached results.
export type SearchView = { sort: SearchSort; posted: string | null; past: string | null; future: string | null; timeZone: string };

// The first page of a search, and the links on to later ones.
export async function searchPage(
  query: string,
  userId: number | null,
  onlyWatched: boolean,
  view: SearchView,
  locale: Locale = DEFAULT_LOCALE,
): Promise<SearchPage & { error?: string; watchVersion?: string }> {
  view = { ...view, timeZone: zoneFor(query, view.timeZone) };
  // Watched results are one person's list and must change the moment they
  // watch or unwatch a pin, so they skip the shared, briefly stale cache.
  if (!onlyWatched || !userId) return cachedSearch(query, view, locale);
  // watchVersion keys the results on the page: Next keeps a page left for
  // another mounted but hidden, so without it coming back to Watched after
  // watching a pin elsewhere showed the list as it was.
  const [page, watchVersion] = await Promise.all([runSearch(query, userId, true, view), Favorite.listVersion(userId)]);
  await localizePins(page.pins, locale);
  return { ...page, watchVersion };
}

// Built with no viewer, so one entry serves everyone rather than one per
// signed-in reader; the cards ask who watches what.
async function cachedSearch(query: string, view: SearchView, locale: Locale) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const page = withoutViewerState(await runSearch(query, NO_VIEWER, false, view));
  await localizePins(page.pins, locale);
  return page;
}

async function runSearch(query: string, userId: number | null, onlyWatched: boolean, view: SearchView): Promise<SearchPage & { error?: string }> {
  const params = new URLSearchParams({ q: query, sort: view.sort });
  if (onlyWatched) params.set('f', 'watch');
  params.set('tz', view.timeZone);
  if (view.posted) params.set('created_within', view.posted);
  if (view.past) params.set('start_past', view.past);
  if (view.future) params.set('start_future', view.future);
  try {
    const { pins, links } = await searchPinsPage(readSearchRequest(params, userId));
    return { ...toJson<SearchPage>(pins), links };
  } catch (err) {
    return { pins: [], links: {}, error: (err as Error).message };
  }
}

// The viewer's zone if the query's days depend on it, else UTC: one cache
// entry for every zone whenever the zone makes no difference.
function zoneFor(query: string, timeZone: string): string {
  return dependsOnZone(parseSearchQuery(query)) ? timeZone : 'UTC';
}

// The tag cloud: the most used tags on the timeline (under its posted-within
// span) or in a search's results. Cached for everyone, since the tags carry
// nothing per viewer; the Watch list is read per request.
// The panel shows TAG_CLOUD_SIZE; its expanded cloud asks for up to TAG_CLOUD_MAX.
export const TAG_CLOUD_SIZE = 60;
export const TAG_CLOUD_MAX = 200;

// The tag cloud's counts. A cold read scores every pin's confidence (~1.3s on
// production), so they are kept for hours: a pin change still refreshes them
// behind the scenes (TAGS.timeline, 'max'), and 'minutes' let them expire
// after an idle hour, which a quiet site mostly is, so most clouds waited.
export async function timelineTagCounts(created: CreatedQuery, limit = TAG_CLOUD_SIZE): Promise<TagCount[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  return Pins.countTimelineTags(resolveCreatedSince(created), await timelineMinConfidence(), limit);
}

export async function searchPageTagCounts(
  query: string,
  userId: number | null,
  onlyWatched: boolean,
  created: CreatedQuery,
  timeZone: string,
  limit = TAG_CLOUD_SIZE,
): Promise<TagCount[]> {
  // The counts leave out the terms the cloud writes (searchTagCounts), so they
  // are cached without them too: every pick in the cloud then reads the same
  // counts, rather than a snapshot of its own taken minutes apart, whose
  // drift would lay the whole cloud out again.
  const counted = joinSearchQuery(splitSearchQuery(query).filter((part) => part.kind !== 'term' || !CLOUD_FIELDS.has(part.field)));
  const zone = zoneFor(counted, timeZone);
  return onlyWatched && userId
    ? searchTagCounts(counted, limit, { userId, onlyWatched: true, timeZone: zone, createdSince: resolveCreatedSince(created) })
    : cachedTagCounts(counted, created, zone, limit);
}
const CLOUD_FIELDS = new Set(['tag', 'category', 'confidence']);

// Kept for hours, as timelineTagCounts is.
async function cachedTagCounts(query: string, created: CreatedQuery, timeZone: string, limit: number): Promise<TagCount[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  return searchTagCounts(query, limit, { userId: null, onlyWatched: false, timeZone, createdSince: resolveCreatedSince(created) });
}

export async function pinComments(id: number) {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const { default: Comment } = await import('../model/comment');
  return toJson<import('@/lib/types').CommentJson[]>(await Comment.getByPinId(id));
}
