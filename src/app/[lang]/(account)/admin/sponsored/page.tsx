import { AdTranslationToggle } from '../../profile/ads/AdTranslationToggle';
import type { Metadata } from 'next';
import { AdPreview } from '@/components/ads/AdBlock';
import { blobUrl } from '@/lib/appConfig';
import { dollars } from '@/lib/sponsoredAds';
import { requireAdminViewer } from '@/server/guard';
import SponsoredAd from '@/server/model/sponsoredAd';
import { AUTO_APPROVE_HOURS } from '@/server/services/sponsoredReview';
import { AdminTabs } from '../AdminTabs';
import { ReviewActions } from './ReviewActions';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin sponsored ads' };

// Paid ads waiting for a decision. An ad nobody reviews goes live by itself
// AUTO_APPROVE_HOURS after it was paid for (services/sponsoredReview.ts).
export default async function AdminSponsoredPage() {
  await requireAdminViewer('/admin/sponsored');
  const queue = await SponsoredAd.reviewQueue();
  const clicks = await SponsoredAd.recentClicks();
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/sponsored" />
      <h1 className="sr-only">Sponsored ads</h1>
      <p className="mb-6 text-sm text-subtle">
        Ads people paid for, waiting for review. Approve to start them, or reject with a reason and the payment is refunded. Anything left unreviewed goes live
        automatically {AUTO_APPROVE_HOURS} hours after payment.
      </p>
      {queue.length === 0 ? <p className="text-subtle">Nothing is waiting.</p> : null}
      <div className="space-y-4">
        {queue.map((ad) => {
          return (
            <article key={ad.id} className="surface space-y-3 p-5">
              <AdPreview title={ad.title} body={ad.body} url={ad.url} imageUrl={blobUrl(ad.imageName) ?? null} />
              <div className="min-w-0">
                <a href={ad.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm text-link">{ad.url}</a>
                <p className="mt-1 text-xs text-subtle">
                  {ad.ownerName} {ad.ownerEmail ? `(${ad.ownerEmail})` : ''} &middot; {ad.impressionsBought.toLocaleString('en-US')} impressions &middot; {dollars(ad.priceCents)}
                  {ad.status === 'in_review' ? <> &middot; waiting {ad.waitingHours.toFixed(1)}h of {AUTO_APPROVE_HOURS}h</> : null}
                </p>
              </div>
              {ad.needsRefund ? (
                <p className="text-sm text-danger">
                  Rejected, but Stripe could not refund it automatically. Refund payment {ad.stripePaymentIntent} in the Stripe dashboard, then mark it refunded.
                </p>
              ) : null}
              <AdTranslationToggle id={ad.id} enabled={ad.autoTranslate} admin />
              <ReviewActions id={ad.id} needsRefund={ad.needsRefund} />
            </article>
          );
        })}
      </div>
      <h2 className="mb-2 mt-10 text-lg font-semibold">Latest clicks</h2>
      {clicks.length === 0 ? <p className="text-sm text-subtle">No clicks yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr><th className="pr-4">When (UTC)</th><th className="pr-4">Ad</th><th className="pr-4">IP</th><th className="pr-4">Location</th><th className="pr-4">User</th><th>Page</th></tr>
            </thead>
            <tbody>
              {clicks.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="py-1 pr-4 whitespace-nowrap">{c.at}</td>
                  <td className="py-1 pr-4">{c.title ?? c.adKey}</td>
                  <td className="py-1 pr-4 font-mono">{c.ip ?? '-'}</td>
                  <td className="py-1 pr-4">{[c.city, c.region, c.country].filter(Boolean).join(', ') || 'locating…'}</td>
                  <td className="py-1 pr-4">{c.userName ?? 'guest'}</td>
                  <td className="py-1">{c.page ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
