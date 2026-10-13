import type { Metadata } from 'next';
import { blobUrl } from '@/lib/appConfig';
import { dollars, STATUS_LABEL } from '@/lib/sponsoredAds';
import { requireViewer } from '@/server/guard';
import SponsoredAd from '@/server/model/sponsoredAd';
import { stripeConfigured } from '@/server/stripe';
import { ProfileTabs } from '../ProfileTabs';
import { AdActions } from './AdActions';
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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile/ads" />
      <div className="space-y-6">
        <header>
          <h1 className="sr-only">Ads</h1>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Advertise on Chronopin</h2>
          <p className="mt-2 text-subtle">
            Put your ad next to the pins people follow, on the timeline and on pin pages. You pay once for a fixed number of views; no subscription.
          </p>
        </header>


        {justPaid ? (
          <p className="surface p-4 text-sm text-success" role="status">
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

        <section aria-label="Your ads" className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Your ads</h2>
          {ads.length === 0 ? <p className="text-subtle">You have no ads yet.</p> : null}
          {ads.map((ad) => {
            const s = stats.get(ad.id)!;
            const ctr = s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(2) : '0.00';
            const progress = Math.min(100, Math.round((ad.impressionsServed / ad.impressionsBought) * 100));
            const peak = Math.max(1, ...s.byDay.map((d) => d.impressions));
            return (
              <article key={ad.id} className="surface space-y-3 p-5">
                <div className="flex items-start gap-3">
                  {ad.imageName ? (
                    // eslint-disable-next-line @next/next/no-img-element -- our own blob host
                    <img src={blobUrl(ad.imageName)} alt="" className="size-14 shrink-0 rounded object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{ad.title}</h3>
                    {ad.body ? <p className="text-sm text-subtle">{ad.body}</p> : null}
                    <p className="truncate text-xs text-subtle">{ad.url}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-medium ${STATUS_TONE[ad.status]}`}>{STATUS_LABEL[ad.status]}</span>
                </div>

                {ad.rejectionReason ? (
                  <p className="text-sm text-danger" role="alert">
                    Sent back: {ad.rejectionReason}. {ad.needsRefund ? 'Your refund is being processed.' : 'Your payment was refunded; fix it and pay again.'}
                  </p>
                ) : null}

                {ad.status !== 'draft' ? (
                  <>
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-subtle">Impressions</dt>
                        <dd className="text-lg font-semibold tabular-nums">
                          {ad.impressionsServed.toLocaleString('en-US')}
                          <span className="text-sm font-normal text-subtle"> / {ad.impressionsBought.toLocaleString('en-US')}</span>
                        </dd>
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
                    {s.byDay.length ? (
                      <div>
                        <p className="mb-1 text-xs text-subtle">Impressions per day, last 30 days</p>
                        <div className="flex h-12 items-end gap-0.5" aria-hidden>
                          {s.byDay.map((d) => (
                            <div
                              key={d.day}
                              title={`${d.day}: ${d.impressions} impressions, ${d.clicks} clicks`}
                              className="min-w-1 flex-1 rounded-t bg-accent/70"
                              style={{
                                height: `${Math.max(6, (d.impressions / peak) * 100)}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-subtle">
                    {ad.impressionsBought.toLocaleString('en-US')} impressions for {dollars(ad.priceCents)}, not paid yet.
                  </p>
                )}
                <AdActions id={ad.id} status={ad.status} />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
