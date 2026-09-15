// Settings shared by the server and the browser. Nothing secret belongs here:
// this module is bundled into client code.

export const userRoles = ['guest', 'user', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const searchChoices = [
  { name: 'All', value: undefined },
  { name: 'Watched', value: 'watch' },
] as const;

export const thumbWidth = 400;
export const uploadImageWidth = 1000;

// Development serves thumbs from the local Azurite emulator; the production
// blobs the old default pointed at no longer exist. NEXT_PUBLIC_THUMB_URL_PREFIX
// overrides both, e.g. to test a production build against Azurite.
export const thumbUrlPrefix =
  process.env.NEXT_PUBLIC_THUMB_URL_PREFIX ||
  (process.env.NODE_ENV === 'production'
    ? 'https://chronopin.blob.core.windows.net/thumb/'
    : 'http://127.0.0.1:10000/devstoreaccount1/thumb/');

export const fbAppId = '560731380662615';

export const scrapeType = {
  web: 'web',
  twitter: 'twitter',
  youtube: 'youtube',
} as const;

export const mediumID = {
  image: 1,
  twitter: 2,
  youtube: 3,
} as const;

export const siteName = 'Chronopin';
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.chronopin.com').replace(/\/$/, '');
export const siteDescription =
  'Discover and track upcoming release dates, events, and other important dates.';

// A stored picture is either a full URL (a social login's photo) or a blob
// name under the thumb container (an uploaded picture, or a Medium thumb).
export function blobUrl(nameOrUrl: string | null | undefined): string | undefined {
  if (!nameOrUrl) {
    return undefined;
  }
  return /^https?:\/\//i.test(nameOrUrl) ? nameOrUrl : thumbUrlPrefix + nameOrUrl;
}
