// The JSON shapes the API and server components hand to the UI. Dates are
// ISO strings once serialised.

import type { CommentMood } from './commentMood';
import type { PinAwardJson } from './awards';
import type { PinTagJson } from './tags';

import type { ThemePreference } from './theme';
import type { Locale } from './i18n/config';
import type { PinPlaceHandlesJson } from './places';

export type CardStock = { symbol: string; name: string | null; relation: 'company' | 'related' | 'supplier'; assetClass: 'stocks' | 'etf'; startPrice: number | null; startDay: string | null };

export type MediumJson = {
  id?: number;
  thumbName?: string;
  thumbWidth?: number;
  thumbHeight?: number;
  originalUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  // 1 image, 2 tweet, 3 YouTube. A string on some query paths.
  type: number | string;
  authorName?: string;
  authorUrl?: string;
  html?: string;
};

export type MerchantJson = {
  id?: number;
  label?: string;
  url?: string;
  price?: number;
};

export type PinReferenceJson = {
  id?: number;
  url: string;
  title?: string;
  // How strongly this link supports the pin, 0-100.
  confidence: number;
  publishedDate?: string; // YYYY-MM-DD
  // When this link says the event starts and ends (YYYY-MM-DD, end inclusive).
  startDate?: string;
  endDate?: string;
  // Why it got that confidence: what the page says about the event and date.
  reasoning?: string;
  utcCreatedDateTime?: string;
  // Who added it, when that was not the pin's author (set by the server).
  addedByUserId?: number;
  addedByUserName?: string;
  addedByUserPictureUrl?: string;
};

export type PinRatingJson = {
  id?: number;
  source: string;
  // In the source's own scale, e.g. 8.4 (IMDb, out of 10) or 92 (Rotten
  // Tomatoes, out of 100).
  score: number;
  scoreMax: number;
  url?: string;
  utcCreatedDateTime?: string;
};

// What a pin's episodeCount counts (scripts/db/schema/0047_pin_episodes.sql):
// the finished run, the episodes out so far, or the announced total of a run
// still airing.
export const EPISODE_STATUSES = ['complete', 'ongoing', 'planned'] as const;
export type EpisodeStatus = (typeof EPISODE_STATUSES)[number];

export type PinUserJson = {
  id: number;
  userName?: string;
  pictureUrl?: string;
};

export type PinFlightPathJson = {
  label?: string | null;
  sourceUrl?: string | null;
  // Computed by us (src/lib/groundTrack.ts), not taken from a simulation.
  estimated: boolean;
  // [latitude, longitude] in flight order, starting at the pin's place.
  points: [number, number][];
};

export type PinJson = {
  id: number;
  // In a language other than English, when the pin's words are its
  // translation: its own title (the URL slug is made from it) and the language.
  originalTitle?: string;
  translatedTo?: string;
  parentId?: number;
  rootThread?: boolean;
  title: string;
  description?: string;
  sourceUrl?: string;
  longFormSummary?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceLowerBound?: number;
  priceUpperBound?: number;
  price?: number;
  priceCurrency?: string;
  tip?: string;
  dateConfidence?: string;
  dateConfidenceReasoning?: string;
  companyId?: number;
  company?: string;
  companyWikiUrl?: string;
  companyLogoUrl?: string;
  // Its category tags (src/lib/categories.ts), the main one first.
  categories?: string[];
  utcStartDateTime: string;
  utcEndDateTime?: string;
  // The dates the source gave, set only while a more confident reference's
  // dates are used instead (src/lib/dateClaims.ts).
  sourceStartDateTime?: string;
  sourceEndDateTime?: string;
  // The day first promised before the start slipped ("2027-12-31"), and how
  // that and the new date were found (src/lib/delay.ts).
  originalStartDate?: string;
  delayReasoning?: string;
  // How many episodes a work released in episodes has, and what that number
  // counts: the finished run ("complete"), the episodes out so far with more
  // coming ("ongoing"), or the total announced for a run still airing
  // ("planned"). Both absent for a film or a one-off event.
  episodeCount?: number;
  episodeStatus?: EpisodeStatus;
  // The dollars traded on the prediction markets its links cite, as last read
  // (schema 0053). Absent when it cites none, or when no exchange reports
  // volume for the ones it cites. Its live per-market counterpart arrives with
  // the odds (lib/predictionMarkets.ts); this one weighs the pin on a crowded
  // day (lib/bagSample.ts).
  marketVolume?: number | null;
  allDay?: boolean;
  // Whether the source said the event runs all day, rather than us simply
  // never learning the time (schema 0057). Only an all-day pin can carry it,
  // and only these print an "All day" label.
  allDayStated?: boolean;
  utcCreatedDateTime?: string;
  utcUpdatedDateTime?: string;
  favoriteCount?: number;
  likeCount?: number;
  // Page views, once per viewer per day.
  viewCount?: number;
  // Times its card was seen on the timeline, once per viewer per day. Only
  // timeline pages and search results carry it (not a pin's own page, nor a
  // live broadcast).
  impressionCount?: number;
  // The pin and every pin confirmed as a duplicate of it, lowest id first;
  // absent when it has none (src/lib/duplicates.ts).
  duplicateGroup?: number[];
  hasFavorite?: boolean;
  hasLike?: boolean;
  searchScore?: number;
  reverseOrder?: number;
  userId?: number;
  user?: PinUserJson;
  media?: MediumJson[];
  merchants?: MerchantJson[];
  references?: PinReferenceJson[];
  ratings?: PinRatingJson[];
  // Its stock tickers, company first, with each one's close on the start date.
  stocks?: CardStock[];
  // What the work won or was nominated for (film, series, anime pins).
  awards?: PinAwardJson[];
  // Its tags: its own, the awards its text names, its awards' bodies and years.
  tags?: PinTagJson[];
  // Where it goes from its place (a rocket's ground track); the map draws it on the pin's page.
  flightPath?: PinFlightPathJson;
  // Where its place is on Google and Yelp, and how to book a table. Handles
  // only: the scores themselves are fetched live from /api/pins/:id/place,
  // because neither source allows its ratings to be stored (PinPlace, 0059).
  place?: PinPlaceHandlesJson;
};

// A pin ready for a card: its description already sanitised (on the server
// with sanitize-html, or in the browser for pages loaded later).
export type CardPin = PinJson & { safeDescription?: string };

// All a map marker reads: where the pin is, when it is, and what goes in its
// popup. A subset of PinJson rather than a shape of its own, so the map can
// plot one of these or a whole pin - the focused pin still arrives entire
// from /api/pins/:id.
export type MapPinJson = Pick<PinJson, 'id' | 'title' | 'address' | 'categories' | 'allDay' | 'utcStartDateTime' | 'utcCreatedDateTime' | 'latitude' | 'longitude'> & {
  media?: Pick<MediumJson, 'type' | 'thumbName' | 'originalUrl'>[];
};

export type DateTimeJson = {
  id: number;
  title: string;
  description?: string;
  utcStartDateTime: string;
  allDay?: boolean;
  alwaysShow?: boolean;
};

// A pin whose views are rising, for the timeline's trending panel: views over
// the recent window and over the same length of time before it.
export type TrendingPin = {
  id: number;
  title: string;
  originalTitle?: string;
  translatedTo?: string;
  views: number;
  previousViews: number;
  thumbName?: string | null;
  originalUrl?: string | null;
};

// A recently added pin, for the timeline's new pins panel.
export type NewPin = {
  id: number;
  title: string;
  originalTitle?: string;
  translatedTo?: string;
  userName: string | null;
  utcCreatedDateTime: string;
  thumbName?: string | null;
  originalUrl?: string | null;
  // Whether it links a Kalshi or Polymarket market, so has live odds.
  hasMarket?: boolean;
};

export type TimelinePage = {
  pins: PinJson[];
  dateTimes: DateTimeJson[];
  queryCount?: number;
};

// The company a company: search names, for the panel it opens with (0048):
// what the company is in a line, how its pins' comments read, and how many
// people follow it. `mood` is null until a comment on one of its pins has
// been scored; `commentCount` is how many comments it was read from.
export type SearchedCompany = {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  wikiUrl: string | null;
  followerCount: number;
  commentCount: number;
  mood: CommentMood | null;
};

export type SearchPage = {
  pins: PinJson[];
  queryCount?: number;
  user?: { id: number; userName: string };
  company?: SearchedCompany;
  // Query strings for /api/pins/search: the pages before and after this one.
  links?: { previous?: string; next?: string };
};

export type CommentJson = {
  id: number;
  text: string;
  parentCommentId?: number;
  // Claude's read on its tone, -1..1; null until scored (and after an edit).
  sentiment?: number | null;
  utcCreatedDateTime: string;
  utcUpdatedDateTime?: string;
  userId: number;
  pinId: number;
  userName?: string;
  userPictureUrl?: string;
};

export type SessionUser = {
  id: number;
  userName: string;
  firstName?: string;
  lastName?: string;
  // A YYYY-MM-DD day, given at sign-up or on the profile, or absent: it is
  // optional, and never shown to anyone but the user and an admin.
  birthday?: string | null;
  email?: string;
  role: string;
  provider?: string;
  pictureUrl?: string;
  defaultFilterSpanPreference?: string;
  themePreference?: ThemePreference | null;
  // The language pages open in; null follows the browser (cookie).
  localePreference?: Locale | null;
  // Off hides the company's stock price on pin cards.
  showCardStockPrices?: boolean;
};

// Converts a model object (with Dates and toJSON) into plain JSON data that
// can cross the server/client component boundary.
export function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
