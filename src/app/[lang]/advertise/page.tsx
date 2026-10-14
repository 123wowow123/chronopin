import type { Metadata } from 'next';
import { AdPreview } from '@/components/ads/AdBlock';
import Link from '@/components/ui/Link';
import { redirect } from '@/lib/i18n/server';
import { CUSTOM_MAX, CUSTOM_MIN, CUSTOM_RATE_CENTS, dollars, exampleTracking, perThousand, SPONSORED_PACKAGES } from '@/lib/sponsoredAds';
import { AdChart } from '../(account)/profile/ads/AdChart';

export const metadata: Metadata = {
  title: 'Advertise on Chronopin',
  description: 'Put your ad next to the pins people follow. Pay once for a fixed number of views, from $5 for 1,000. No subscription.',
};

const PLACEMENTS = [
  { title: 'The timeline', text: 'Between the days people scroll to see what is coming and what just happened.' },
  { title: 'Pin pages', text: 'Beside the event, release or launch a reader is already looking at.' },
  { title: 'Guides and lists', text: 'In restaurant, product and car guides, and the side panel and menu.' },
];

const STEPS = [
  { title: 'Write your ad', text: 'A headline, a line of text, a link and an optional picture.' },
  { title: 'Pay once', text: 'Choose how many views to buy and pay by card. No subscription, no auto-renew.' },
  { title: 'We review it', text: 'Ads are checked by a person and go live within 24 hours at the latest.' },
  { title: 'Watch it work', text: 'See views, unique people and clicks per day, and set a daily cap if you want to spread it out.' },
];

// The public page for advertisers. The portal itself (buying, editing and
// tracking ads) is the Ads tab of the profile, which asks signed-out visitors
// to sign in first. Old links with ?paid= or ?edit= still land there.
export default async function AdvertiseLanding({ searchParams }: { searchParams: Promise<{ paid?: string; edit?: string }> }) {
  const { paid, edit } = await searchParams;
  if (paid || edit) {
    const query = new URLSearchParams();
    if (paid) query.set('paid', paid);
    if (edit) query.set('edit', edit);
    return redirect(`/profile/ads?${query}`);
  }
  const bought = 5000;
  const sample = exampleTracking(bought);
  const ctr = ((sample.clicks / sample.impressions) * 100).toFixed(2);
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">Advertise on Chronopin</h1>
      <p className="mb-6 text-lg text-muted">
        Put your ad next to the pins people follow. You pay once for a fixed number of views, and you see exactly how it does.
      </p>
      <p className="mb-10 flex flex-wrap gap-2">
        <Link href="/profile/ads" className="btn btn-primary">Create an ad</Link>
        <Link href="/contact" className="btn btn-secondary">Ask us a question</Link>
      </p>

      <h2 className="mb-3 text-xl font-semibold">Where it shows</h2>
      <ul className="mb-10 grid gap-3 sm:grid-cols-3">
        {PLACEMENTS.map((p) => (
          <li key={p.title} className="surface p-4">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-subtle">{p.text}</p>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-xl font-semibold">A sample ad</h2>
      <p className="mb-3 text-sm text-subtle">A headline, a line of text and a picture, shown the way readers see it in each place.</p>
      <AdPreview
        title="Sample Bagel Shop"
        body="Fresh bagels baked every morning, a block from the park."
        url="https://example.com"
        imageUrl="/ads/example-bagels.png"
        className="mb-10"
      />

      <h2 className="mb-3 text-xl font-semibold">A sample report</h2>
      <section aria-label="Sample report" className="surface mb-10 space-y-4 p-5">
        <p className="text-sm text-subtle">
          Example numbers for a {bought.toLocaleString('en-US')}-view package ({dollars(SPONSORED_PACKAGES[1].priceCents)}), two weeks in. Your own report updates as your ad is shown.
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-subtle">Views</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {sample.impressions.toLocaleString('en-US')}
              <span className="text-sm font-normal text-subtle"> / {bought.toLocaleString('en-US')}</span>
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Unique people</dt>
            <dd className="text-lg font-semibold tabular-nums">{sample.uniques.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt className="text-subtle">Clicks</dt>
            <dd className="text-lg font-semibold tabular-nums">{sample.clicks.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt className="text-subtle">Click rate</dt>
            <dd className="text-lg font-semibold tabular-nums">{ctr}%</dd>
          </div>
        </dl>
        <AdChart days={sample.byDay} />
        <p className="text-xs text-subtle">Example only, not real results.</p>
      </section>

      <h2 className="mb-3 text-xl font-semibold">Pricing</h2>
      <ul className="mb-3 grid gap-3 sm:grid-cols-3">
        {SPONSORED_PACKAGES.map((pkg) => (
          <li key={pkg.impressions} className="surface p-4">
            <p className="text-2xl font-semibold">{dollars(pkg.priceCents)}</p>
            <p className="font-medium">{pkg.impressions.toLocaleString('en-US')} views</p>
            <p className="text-sm text-subtle">{perThousand(pkg)} per 1,000</p>
          </li>
        ))}
        <li className="surface p-4">
          <p className="text-2xl font-semibold">{dollars(CUSTOM_RATE_CENTS)}</p>
          <p className="font-medium">per 1,000 views</p>
          <p className="text-sm text-subtle">
            Custom: {CUSTOM_MIN.toLocaleString('en-US')} to {CUSTOM_MAX.toLocaleString('en-US')}
          </p>
        </li>
      </ul>
      <p className="mb-10 text-sm text-subtle">
        An ad stops by itself when the bought views are used. Set a maximum per day to make it last.
      </p>

      <h2 className="mb-3 text-xl font-semibold">How it works</h2>
      <ol className="mb-10 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="surface flex gap-4 p-4">
            <span className="font-display text-xl font-semibold text-accent">{i + 1}</span>
            <span>
              <span className="block font-semibold">{s.title}</span>
              <span className="text-sm text-subtle">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <p>
        <Link href="/profile/ads" className="btn btn-primary">Create an ad</Link>
      </p>
    </main>
  );
}
