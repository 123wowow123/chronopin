import type { Metadata } from 'next';
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
              <div className="flex items-start gap-3">
                {ad.imageName ? (
                  // eslint-disable-next-line @next/next/no-img-element -- our own blob host
                  <img src={blobUrl(ad.imageName)} alt="" className="size-20 shrink-0 rounded object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{ad.title}</h2>
                  {ad.body ? <p className="text-sm">{ad.body}</p> : null}
                  <a href={ad.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm text-link">{ad.url}</a>
                  <p className="mt-1 text-xs text-subtle">
                    {ad.ownerName} {ad.ownerEmail ? `(${ad.ownerEmail})` : ''} &middot; {ad.impressionsBought.toLocaleString('en-US')} impressions &middot; {dollars(ad.priceCents)}
                    {ad.status === 'in_review' ? <> &middot; waiting {ad.waitingHours.toFixed(1)}h of {AUTO_APPROVE_HOURS}h</> : null}
                  </p>
                </div>
              </div>
              {ad.needsRefund ? (
                <p className="text-sm text-danger">
                  Rejected, but Stripe could not refund it automatically. Refund payment {ad.stripePaymentIntent} in the Stripe dashboard, then mark it refunded.
                </p>
              ) : null}
              <ReviewActions id={ad.id} needsRefund={ad.needsRefund} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
