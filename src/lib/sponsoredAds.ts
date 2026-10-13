// What a self-serve ad is: the packages on sale and the rules a creative
// follows, shared by the portal's form and the API that saves it.

export const SPONSORED_PACKAGES = [
  { impressions: 1000, priceCents: 500 },
  { impressions: 5000, priceCents: 1000 },
] as const;

export type SponsoredStatus = 'draft' | 'in_review' | 'active' | 'paused' | 'completed';

export const TITLE_MAX = 60;
export const BODY_MAX = 140;

// A custom size: CUSTOM_MIN impressions or more, in whole thousands, at a flat
// rate per thousand.
export const CUSTOM_MIN = 10000;
export const CUSTOM_MAX = 1000000;
export const CUSTOM_STEP = 1000;
export const CUSTOM_RATE_CENTS = 175;

// What `impressions` costs, or null when it is not a size on sale. The price
// is always worked out here, never taken from the browser.
export function packageFor(impressions: unknown): { impressions: number; priceCents: number } | null {
  const n = Number(impressions);
  const fixed = SPONSORED_PACKAGES.find((p) => p.impressions === n);
  if (fixed) return { impressions: fixed.impressions, priceCents: fixed.priceCents };
  if (Number.isInteger(n) && n >= CUSTOM_MIN && n <= CUSTOM_MAX && n % CUSTOM_STEP === 0) {
    return { impressions: n, priceCents: (n / 1000) * CUSTOM_RATE_CENTS };
  }
  return null;
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

// The cost per thousand, so the bigger package reads as the better one.
export function perThousand(pkg: { impressions: number; priceCents: number }): string {
  return dollars(Math.round((pkg.priceCents / pkg.impressions) * 1000));
}

export type SponsoredFields = { title: string; body: string; url: string };

// A problem message for the form, or null. https only, no credentials in the
// link, no private hosts.
export function creativeProblem(fields: Partial<SponsoredFields>): string | null {
  const title = (fields.title ?? '').trim();
  const body = (fields.body ?? '').trim();
  if (!title) return 'Add a headline.';
  if (title.length > TITLE_MAX) return `The headline can be up to ${TITLE_MAX} characters.`;
  if (body.length > BODY_MAX) return `The text can be up to ${BODY_MAX} characters.`;
  let url: URL;
  try {
    url = new URL((fields.url ?? '').trim());
  } catch {
    return 'Enter the full link, starting with https://.';
  }
  if (url.protocol !== 'https:') return 'The link must start with https://.';
  if (url.username || url.password) return 'The link cannot contain a username or password.';
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return 'Use a public web address.';
  if (`${url}`.length > 2000) return 'That link is too long.';
  return null;
}

export const STATUS_LABEL: Record<SponsoredStatus, string> = {
  draft: 'Not paid yet',
  in_review: 'In review',
  active: 'Live',
  paused: 'Paused',
  completed: 'Finished',
};
