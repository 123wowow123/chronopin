import type { Metadata } from 'next';
import { AdPreview } from '@/components/ads/AdBlock';
import { blobUrl } from '@/lib/appConfig';
import { dollars, exampleTracking, STATUS_LABEL } from '@/lib/sponsoredAds';
import { requireViewer } from '@/server/guard';
import SponsoredAd from '@/server/model/sponsoredAd';
import { stripeConfigured } from '@/server/stripe';
import { ProfileTabs } from '../ProfileTabs';
import { AdActions } from './AdActions';
import { AdChart } from './AdChart';
import { AdForm } from './AdForm';

// Reads the session, so it blocks per request (see ../layout.tsx).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Advertise on Chronopin', robots: { index: false } };
}

const STATUS_TONE: Record<string, string> = {
  active: 'text-success',
  in_review: 'text-warning',
  paused: 'text-subtle',
  completed: 'text-subtle',
  draft: 'text-subtle',
};

// The advertiser's portal: buy impressions, write the ad, watch how it does.
// Everything is shown as one page: the packages, the form, then the user's ads
// with their numbers (src/server/model/sponsoredAd.ts stats).
export default async function AdvertisePage({ searchParams }: { searchParams: Promise<{ paid?: string; edit?: string }> }) {
  const user = await requireViewer('/profile/ads');
  const [ads, query] = await Promise.all([SponsoredAd.listForUser(user.id), searchParams]);
  const stats = await SponsoredAd.stats(ads.map((ad) => ad.id));
  const editing = ads.find((ad) => String(ad.id) === query.edit && ad.status === 'draft') ?? null;
  const justPaid = ads.find((ad) => String(ad.id) === query.paid) ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 lg:max-w-5xl">
      <ProfileTabs current="/profile/ads" />
      <div className="space-y-6">
        <header className="lg:pr-[21.5rem]">
          <h1 className="sr-only">Ads</h1>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Advertise on Chronopin</h2>
          <p className="mt-2 text-subtle">
            Put your ad next to the pins people follow, on the timeline and on pin pages. You pay once for a fixed number of views; no subscription.
          </p>
        </header>


        {justPaid ? (
          <p className="surface p-4 text-sm text-success lg:mr-[21.5rem]" role="status">
            Thank you. &ldquo;{justPaid.title}&rdquo; is paid for and{' '}
            {justPaid.status === 'active' ? 'live now.' : 'in review. It goes live once approved, and within 24 hours at the latest.'}
          </p>
        ) : null}

        {stripeConfigured() ? (
          <AdForm
            key={editing?.id ?? 'new'}
            initial={
              editing
                ? {
                    id: editing.id,
                    title: editing.title,
                    body: editing.body,
                    url: editing.url,
                    impressions: editing.impressionsBought,
                    imageUrl: blobUrl(editing.imageName) ?? null,
                  }
                : null
            }
          />
        ) : (
          <p className="surface p-4 text-sm text-subtle">Ad purchases are not open yet.</p>
        )}

        <section aria-label="Your ads" className="space-y-4 lg:pr-[21.5rem]">
          <h2 className="font-display text-xl font-semibold">Your ads</h2>
          {ads.length === 0 ? <p className="text-subtle">You have no ads yet.</p> : null}
          {ads.map((ad) => {
            // An ad that is not live yet shows made-up numbers, labelled as such,
            // so the advertiser sees what the tracking will look like.
            const example = ad.status === 'draft';
            const s = example ? exampleTracking(ad.impressionsBought) : stats.get(ad.id)!;
            const delivered = example ? s.impressions : ad.impressionsServed;
            const ctr = s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(2) : '0.00';
            const progress = Math.min(100, Math.round((delivered / ad.impressionsBought) * 100));
            return (
              <article key={ad.id} className="surface space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs text-subtle">{ad.url}</p>
                  <span className={`shrink-0 text-sm font-medium ${STATUS_TONE[ad.status]}`}>{STATUS_LABEL[ad.status]}</span>
                </div>
                <AdPreview title={ad.title} body={ad.body} url={ad.url} imageUrl={blobUrl(ad.imageName) ?? null} />

                {ad.rejectionReason ? (
                  <p className="text-sm text-danger" role="alert">
                    Sent back: {ad.rejectionReason}. {ad.needsRefund ? 'Your refund is being processed.' : 'Your payment was refunded; fix it and pay again.'}
                  </p>
                ) : null}

                {example ? (
                  <p className="text-sm text-subtle">
                    {ad.impressionsBought.toLocaleString('en-US')} impressions for {dollars(ad.priceCents)}, not paid yet. Once it is live you will see its tracking, like this example:
                  </p>
                ) : null}
                <div className={example ? 'space-y-3 rounded-lg border border-dashed border-line p-3' : 'space-y-3'}>
                  {example ? <p className="text-[11px] font-semibold tracking-wider text-subtle uppercase">Example tracking, not real numbers</p> : null}
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-subtle">Impressions</dt>
                      <dd className="text-lg font-semibold tabular-nums">
                        {delivered.toLocaleString('en-US')}
                        <span className="text-sm font-normal text-subtle"> / {ad.impressionsBought.toLocaleString('en-US')}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle">Unique people</dt>
                      <dd className="text-lg font-semibold tabular-nums">{s.uniques.toLocaleString('en-US')}</dd>
                    </div>
                    <div>
                      <dt className="text-subtle">Clicks</dt>
                      <dd className="text-lg font-semibold tabular-nums">{s.clicks.toLocaleString('en-US')}</dd>
                    </div>
                    <div>
                      <dt className="text-subtle">Click rate</dt>
                      <dd className="text-lg font-semibold tabular-nums">{ctr}%</dd>
                    </div>
                  </dl>
                  <div
                    className="h-2 overflow-hidden rounded bg-raised-2"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Impressions delivered"
                  >
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                  {s.byDay.length ? <AdChart days={s.byDay} /> : null}
                </div>
                <AdActions id={ad.id} status={ad.status} />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
