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
