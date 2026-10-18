// The review of paid ads: @ThePinGang is told (browser notification and email)
// the moment an ad is paid for and waits for approval, and an ad that has sat
// unreviewed for 24 hours goes live by itself.

import { dollars } from '@/lib/sponsoredAds';
import * as db from '../db';
import { sendEmail } from '../email';
import Ad from '../model/ad';
import { pushToUser } from '../push';
import log from '../util/log';

export const AUTO_APPROVE_HOURS = 24;
const CHECK_MS = 10 * 60 * 1000;
const REVIEWER_HANDLE = 'thepingang';

const g = globalThis as unknown as { __chronopinSponsoredTimer?: ReturnType<typeof setInterval> };

async function reviewer(): Promise<{ id: number; email: string | null } | null> {
  const [row] = await db.query<{ id: number; email: string | null }>(
    `SELECT "id", "email" FROM "User" WHERE lower(regexp_replace("userName", '^@', '')) = $1 LIMIT 1`,
    [REVIEWER_HANDLE],
  );
  return row ?? null;
}

function origin(): string {
  return process.env.NODE_ENV === 'production' ? 'https://www.chronopin.com' : 'http://localhost:3000';
}

// Never throws: it runs after the payment webhook has been handled.
export async function notifyReviewNeeded(ad: { id: number; title: string; body: string; url: string; impressionsBought: number; priceCents: number }) {
  try {
    const admin = await reviewer();
    if (!admin) return log.warn('[ads] no @ThePinGang account to tell about ad', ad.id);
    const queue = `${origin()}/admin/sponsored`;
    const summary = `${ad.impressionsBought.toLocaleString('en-US')} impressions for ${dollars(ad.priceCents)}`;
    await Promise.allSettled([
      pushToUser(admin.id, {
        title: 'Ad needs approval',
        body: `${ad.title} - ${summary}. Auto-approves in ${AUTO_APPROVE_HOURS}h.`,
        url: '/admin/sponsored',
        image: null,
        tag: `sponsored-ad-${ad.id}`,
      }),
      admin.email
        ? sendEmail({
            to: admin.email,
            subject: `Ad needs approval: ${ad.title}`,
            text: [
              `A paid ad is waiting for your approval.`,
              ``,
              `Headline: ${ad.title}`,
              ad.body ? `Text: ${ad.body}` : '',
              `Link: ${ad.url}`,
              `Package: ${summary}`,
              ``,
              `Review it: ${queue}`,
              `If nobody reviews it, it goes live automatically after ${AUTO_APPROVE_HOURS} hours.`,
            ]
              .filter((line) => line !== '' || true)
              .join('\n'),
            html: `<p>A paid ad is waiting for your approval.</p>
<p><strong>${esc(ad.title)}</strong><br>${esc(ad.body)}<br><a href="${esc(ad.url)}">${esc(ad.url)}</a></p>
<p>${esc(summary)}</p>
<p><a href="${queue}">Review it</a>. If nobody reviews it, it goes live automatically after ${AUTO_APPROVE_HOURS} hours.</p>`,
          })
        : Promise.resolve(),
    ]);
  } catch (err) {
    log.warn('[ads] telling the reviewer failed:', (err as Error).message);
  }
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Ads paid for more than AUTO_APPROVE_HOURS ago and still unreviewed.
export async function approveStaleAds(): Promise<number> {
  const rows = await db.query<{ id: number; title: string }>(
    `UPDATE "SponsoredAd" SET "status" = 'active', "approvedDateTime" = now(), "utcUpdatedDateTime" = now()
     WHERE "status" = 'in_review' AND "paidDateTime" < now() - make_interval(hours => $1::int) RETURNING "id", "title"`,
    [AUTO_APPROVE_HOURS],
  );
  if (rows.length) {
    Ad.expireInventory();
    log.info(`[ads] auto-approved ${rows.length} unreviewed ad(s): ${rows.map((r) => r.id).join(', ')}`);
    const admin = await reviewer().catch(() => null);
    if (admin?.email) {
      void sendEmail({
        to: admin.email,
        subject: `${rows.length} ad(s) went live automatically`,
        text: `These paid ads were not reviewed within ${AUTO_APPROVE_HOURS} hours and are now live:\n${rows.map((r) => `- #${r.id} ${r.title}`).join('\n')}\n\nSee ${origin()}/admin/sponsored`,
        html: `<p>These paid ads were not reviewed within ${AUTO_APPROVE_HOURS} hours and are now live:</p><ul>${rows.map((r) => `<li>#${r.id} ${esc(r.title)}</li>`).join('')}</ul>`,
      }).catch(() => {});
    }
  }
  return rows.length;
}

export function startSponsoredReview() {
  if (g.__chronopinSponsoredTimer) return;
  const tick = () => void approveStaleAds().catch((err) => log.warn('[ads] auto-approve failed:', (err as Error).message));
  g.__chronopinSponsoredTimer = setInterval(tick, CHECK_MS);
  g.__chronopinSponsoredTimer.unref();
  tick();
}
