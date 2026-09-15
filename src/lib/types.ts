// The JSON shapes the API and server components hand to the UI. Dates are
// ISO strings once serialised.

import type { ThemePreference } from './theme';

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

export type PinUserJson = {
  id: number;
  userName?: string;
  pictureUrl?: string;
};

export type PinJson = {
  id: number;
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
  category?: string;
  utcStartDateTime: string;
  utcEndDateTime?: string;
  // The dates the source gave, set only while a more confident reference's
  // dates are used instead (src/lib/dateClaims.ts).
  sourceStartDateTime?: string;
  sourceEndDateTime?: string;
  allDay?: boolean;
  utcCreatedDateTime?: string;
  utcUpdatedDateTime?: string;
  favoriteCount?: number;
  likeCount?: number;
  // Page views, once per viewer per day.
  viewCount?: number;
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
};

// A pin ready for a card: its description already sanitised (on the server
// with sanitize-html, or in the browser for pages loaded later).
export type CardPin = PinJson & { safeDescription?: string };

export type DateTimeJson = {
  id: number;
  title: string;
  description?: string;
  utcStartDateTime: string;
  allDay?: boolean;
  alwaysShow?: boolean;
};

export type TimelinePage = {
  pins: PinJson[];
  dateTimes: DateTimeJson[];
  queryCount?: number;
};

export type SearchPage = {
  pins: PinJson[];
  queryCount?: number;
  user?: { id: number; userName: string };
  // Query strings for /api/pins/search: the pages before and after this one.
  links?: { previous?: string; next?: string };
};

export type CommentJson = {
  id: number;
  text: string;
  parentCommentId?: number;
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
  email?: string;
  role: string;
  provider?: string;
  pictureUrl?: string;
  defaultFilterSpanPreference?: string;
  themePreference?: ThemePreference | null;
};

// Converts a model object (with Dates and toJSON) into plain JSON data that
// can cross the server/client component boundary.
export function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
