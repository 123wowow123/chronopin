// Buying and reviewing a self-serve ad: the Stripe payment, the review queue
// and the picture. The model (../model/sponsoredAd.ts) holds the rows.

import { randomUUID } from 'node:crypto';
import { blobUrl } from '@/lib/appConfig';
import { creativeProblem, dollars, packageFor } from '@/lib/sponsoredAds';
import * as azureBlob from '../azureBlob';
import { HttpError } from '../http';
import { squareImage } from '../image';
import Ad from '../model/ad';
import SponsoredAd, { type SponsoredRow } from '../model/sponsoredAd';
import { stripeConfigured, stripeRequest } from '../stripe';
import log from '../util/log';
import * as db from '../db';
import { notifyReviewNeeded } from './sponsoredReview';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_SIZE = 480;
const IMAGE_PREFIX = 'adimg/';

// Fields as the form sends them, checked and priced from the package, never
// from a price the browser sent.
export function parseFields(body: Record<string, unknown>) {
  const fields = {
    title: String(body.title ?? '').trim(),
    body: String(body.body ?? '').trim(),
    url: String(body.url ?? '').trim(),
  };
  const problem = creativeProblem(fields);
  if (problem) throw new HttpError(422, problem, { message: problem });
  const pkg = packageFor(body.impressions);
  if (!pkg) throw new HttpError(422, 'Choose a package.', { message: 'Choose a package.' });
  return { ...fields, impressionsBought: pkg.impressions, priceCents: pkg.priceCents };
}

export function storeImageAsAdmin(adId: number, userId: number, file: File): Promise<string> {
  return storeImage(adId, userId, file, true);
}

export async function storeImage(adId: number, userId: number, file: File, asAdmin = false): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, 'Pictures can be up to 5 MB.', { message: 'Pictures can be up to 5 MB.' });
  if (!/^image\//.test(file.type)) throw new HttpError(400, 'Choose an image to upload.', { message: 'Choose an image to upload.' });
  let squared: { buffer: Buffer; type: string };
  try {
    squared = await squareImage(Buffer.from(await file.arrayBuffer()), IMAGE_SIZE);
  } catch {
    throw new HttpError(400, 'That file is not an image we can read.', { message: 'That file is not an image we can read.' });
  }
  const name = `${IMAGE_PREFIX}${userId}-${randomUUID()}.${squared.type === 'image/png' ? 'png' : 'jpg'}`;
  await azureBlob.uploadThumb(name, squared.buffer, squared.type);
  const replaced = asAdmin ? await SponsoredAd.adminSetImage(adId, name) : await SponsoredAd.setImage(adId, userId, name);
  if (!replaced) {
    await azureBlob.deleteThumb(name).catch(() => {});
    throw new HttpError(409, 'This ad can no longer be changed.', { message: 'This ad can no longer be changed.' });
  }
  if (replaced.previous?.startsWith(IMAGE_PREFIX)) await azureBlob.deleteThumb(replaced.previous).catch(() => {});
  return blobUrl(name)!;
}

export async function startCheckout(ad: SponsoredRow, origin: string, email: string | null): Promise<string> {
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  if (ad.status !== 'draft') throw new HttpError(409, 'This ad is already paid for.');
  const problem = creativeProblem(ad);
  if (problem) throw new HttpError(422, problem, { message: problem });
  const pkg = packageFor(ad.impressionsBought);
  if (!pkg) throw new HttpError(422, 'Choose a package.');
  const session = await stripeRequest<{ id: string; url: string }>('POST', '/checkout/sessions', {
    mode: 'payment',
    client_reference_id: String(ad.userId),
    ...(email ? { customer_email: email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pkg.priceCents,
          product_data: {
            name: `Chronopin ad: ${pkg.impressions.toLocaleString('en-US')} impressions`,
            description: ad.title,
          },
        },
      },
    ],
    metadata: { sponsoredAdId: String(ad.id) },
    payment_intent_data: { metadata: { sponsoredAdId: String(ad.id) } },
    success_url: `${origin}/profile/ads?paid=${ad.id}`,
    cancel_url: `${origin}/profile/ads`,
  });
  await SponsoredAd.rememberSession(ad.id, session.id);
  return session.url;
}

// checkout.session.completed for a payment-mode session. Safe to see twice:
// only a draft moves on.
export async function confirmAdPayment(session: Record<string, unknown>) {
  const adId = Number((session.metadata as Record<string, string> | null)?.sponsoredAdId);
  if (!Number.isInteger(adId) || adId <= 0) return;
  const ad = await SponsoredAd.get(adId);
  if (!ad) return log.warn(`[ads] payment for missing ad ${adId}`);
  const [owner] = await db.query<{ role: string }>(`SELECT "role" FROM "User" WHERE "id" = $1`, [ad.userId]);
  const live = owner?.role === 'admin';
  const moved = await SponsoredAd.markPaid(adId, {
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    sessionId: String(session.id),
    live,
  });
  if (!moved) return;
  Ad.expireInventory();
  if (!live) void notifyReviewNeeded(ad);
}

// An admin's decision. Reject sends the ad back to its owner with the reason
// and refunds the payment; when Stripe will not (the key may lack the Refunds
// permission) the ad is flagged for a refund by hand in the dashboard.
export async function rejectAd(adId: number, reason: string): Promise<{ refunded: boolean }> {
  const result = await SponsoredAd.reject(adId, reason);
  if (!result) throw new HttpError(409, 'That ad is not waiting for review.');
  if (!result.paymentIntent) return { refunded: true };
  try {
    await stripeRequest('POST', '/refunds', { payment_intent: result.paymentIntent });
    await SponsoredAd.refunded(adId);
    return { refunded: true };
  } catch (err) {
    log.warn(`[ads] refund for ad ${adId} failed:`, (err as Error).message);
    return { refunded: false };
  }
}

const STATUSES = ['draft', 'in_review', 'active', 'paused', 'completed'] as const;

function dailyLimitOf(raw: unknown): number | null {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1000000) throw new HttpError(422, 'dailyLimit must be a whole number from 1 to 1,000,000, or null.');
  return n;
}

// The admin API's fields, each checked only when present. Unlike the
// advertiser's form, impressions may be any whole number from 1,000 to
// 1,000,000 in thousands, and the price may be set (a complimentary ad is 1).
export function parseAdminFields(body: Record<string, unknown>, partial: boolean) {
  const out: Partial<{
    title: string; body: string; url: string; impressionsBought: number; priceCents: number;
    status: (typeof STATUSES)[number]; dailyLimit: number | null; rejectionReason: string | null;
  }> = {};
  if (!partial || 'title' in body) out.title = String(body.title ?? '').trim();
  if (!partial || 'body' in body) out.body = String(body.body ?? '').trim();
  if (!partial || 'url' in body) out.url = String(body.url ?? '').trim();
  if (out.title !== undefined || out.body !== undefined || out.url !== undefined) {
    const problem = creativeProblem({ title: out.title ?? 'x', body: out.body ?? '', url: out.url ?? 'https://x.invalid' });
    if (problem) throw new HttpError(422, problem, { message: problem });
  }
  if (!partial || 'impressions' in body) {
    const n = Number(body.impressions ?? 1000);
    if (!Number.isInteger(n) || n < 1000 || n > 1000000 || n % 1000 !== 0) {
      throw new HttpError(422, 'impressions must be a multiple of 1,000 from 1,000 to 1,000,000.');
    }
    out.impressionsBought = n;
  }
  if ('priceCents' in body) {
    const n = Number(body.priceCents);
    if (!Number.isInteger(n) || n < 1) throw new HttpError(422, 'priceCents must be a whole number of at least 1.');
    out.priceCents = n;
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status as never)) throw new HttpError(422, `status must be one of ${STATUSES.join(', ')}.`);
    out.status = body.status as (typeof STATUSES)[number];
  }
  if ('dailyLimit' in body) out.dailyLimit = dailyLimitOf(body.dailyLimit);
  if ('rejectionReason' in body) out.rejectionReason = body.rejectionReason == null ? null : String(body.rejectionReason).slice(0, 300);
  return out;
}

export { dollars };
