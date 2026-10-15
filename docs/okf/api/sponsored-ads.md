# Sponsored ads API

Self-serve ads (`SponsoredAd`, 0178+). Money and review rules live in
`src/server/services/sponsoredAds.ts`.

## Advertiser (signed in, own ads only)

| Call | Does |
|---|---|
| `GET /api/advertise/ads` | own ads with stats |
| `POST /api/advertise/ads` | start a draft `{ title, body, url, impressions }` |
| `PATCH /api/advertise/ads/:id` | edit a draft; `{ paused }`; `{ dailyLimit: n \| null }` |
| `DELETE /api/advertise/ads/:id` | delete a draft |
| `POST /api/advertise/ads/:id/checkout` | Stripe Checkout URL |

## Admin (role `admin`)

| Call | Does |
|---|---|
| `GET /api/admin/sponsored-ads` | review queue (+ refunds owed) |
| `GET /api/admin/sponsored-ads?status=&userId=` | every matching ad |
| `POST /api/admin/sponsored-ads` | create with no payment: `{ title, body?, url, impressions?, priceCents?, status?='active', dailyLimit?, userId?=caller }` |
| `GET /api/admin/sponsored-ads/:id` | one ad with stats |
| `PATCH /api/admin/sponsored-ads/:id` | change `title, body, url, impressions, priceCents, status, dailyLimit, rejectionReason, plan, currentPeriodEnd` |
| `PUT /api/admin/sponsored-ads/:id/image` | picture (multipart `picture`), any state |
| `DELETE /api/admin/sponsored-ads/:id` | remove, any state |
| `POST /api/admin/sponsored-ads/:id` | `{ action: approve \| reject (+reason) \| refunded }` |

Notes: `url` must be `https://`; `impressions` is a multiple of 1,000 up to
1,000,000; `dailyLimit` is per UTC day (null = no cap). Every write clears the
ad inventory cache.

## Monthly plan (0183)

`plan: 'monthly'` on `POST/PATCH /api/advertise/ads` sets $20 a month for 15,000
impressions (`MONTHLY_PLAN` in `src/lib/sponsoredAds.ts`). Checkout is a Stripe
subscription whose metadata carries `sponsoredAdId`; the webhook
(`/api/billing/webhook`) handles it:

- `checkout.session.completed` (subscription mode) -> in review / live, saves
  customer + subscription ids.
- `invoice.paid` with `billing_reason: subscription_cycle` -> `impressionsServed`
  back to 0 (a finished ad is live again). Add `invoice.paid` to the endpoint's events.
- `customer.subscription.updated/deleted` -> cancel-at-period-end shown; ended
  subscriptions finish the ad.

`POST /api/advertise/ads/:id/portal` opens Stripe's customer portal (cancel,
card, invoices). Rejecting a monthly ad cancels the subscription and refunds its
first invoice (or flags `needsRefund`).

A monthly ad with no Stripe subscription (an admin-made one) renews itself: once
`currentPeriodEnd` passes, `SponsoredAd.live()` resets its impressions and moves
the date a month on.

## Automatic translation (0184)

New ads have an `autoTranslate` boolean enabled by default (0185). Existing
ads keep their saved setting. The create/edit
form, each saved ad and the admin review page offer a switch. Owners may PATCH
`/api/advertise/ads/:id` with `{ "autoTranslate": true | false }` in any state,
including live ads. Admin create/PATCH accepts the same field.

When enabled, saving schedules headline and body translation into all 16 site
languages after the response, using the configured Anthropic client. The link,
image, prices, impression budget and frequency are unchanged. Text embedded in
images is not translated. Serving reads saved translations for the requested
locale, falling back to original copy when a translation is missing. No model
runs during ad serving. Turning the switch off immediately restores original
copy. Source edits invalidate translations; an in-flight result is saved only
if the source still matches and translation remains enabled.

Apply migration `0184_sponsored_ad_translations.sql` before running the new code.
Without a configured translation API key, or on a failed call, original copy
continues to serve. Saving again or toggling off/on retries missing translations.

Migration 0186 enables translation for existing admin-owned ads as well;
ordinary advertisers retain their saved preference. After deploying, run midnight or news (or Run all jobs now) to fill
missing translations, including production ads 1 and 2. The migration itself
does not call the translation model.

## Session-written translations

Admin authentication (session cookie or bearer token) is required:

- `GET /api/admin/sponsored-ads/:id/translations` exports `title`, `body`,
  `sourceHash`, `autoTranslate`, all supported `locales`, saved `translations`
  and `missingLocales`.
- `POST /api/admin/sponsored-ads/:id/translations` accepts the exported hash
  and a `translations` object keyed by locale. It merges only the supplied
  languages, expires ad inventory and returns `{ saved, locales, sourceHash,
  autoTranslate }`. Neither endpoint calls a translation model.

```json
{
  "sourceHash": "<copy the full sourceHash from GET>",
  "autoTranslate": true,
  "translations": {
    "es": { "title": "Desactiva los anuncios por $1 al mes", "body": "" }
  }
}
```

Translate the actual exported copy, preserving prices, currencies and offer
conditions. Supply both title and body for each language: title must be
non-empty and at most 240 characters, body at most 560. A non-empty source body
requires a non-empty translated body; an empty source body must stay empty.
All 16 site languages, including English, are accepted. Invalid payloads are
422; a stale hash or a concurrent source edit is 409, saving nothing. Fetch
again and translate the updated source before retrying. Languages omitted
from a successful save are preserved. `autoTranslate` is optional: omit it to
keep the display setting, or send `true` to show the saved translations.
Session-written translations take precedence over any in-flight automatic
translation of the same source. Text in pictures, ad links, ownership, budgets
and frequency are untouched.

For this session's two production admin ads, export IDs 1 and 2 and POST their
translations here after deployment; this also enables display without a
server-side model call.

`GET /api/admin/sponsored-ads/translations?after=0&limit=25` is the admin-only
job queue: scans enabled ads by ID and returns `{ ads, nextAfter }`, where each
pending ad includes its exact source, sourceHash and missingLocales. Continue
until nextAfter is null, even if ads is empty. The `adTranslations` task uses
this queue and the per-ad POST through its session tools inside the midnight
and 06:00/18:00 news jobs, including all full-run entry points.
