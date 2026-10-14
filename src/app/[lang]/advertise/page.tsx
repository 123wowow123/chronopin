import type { Metadata } from 'next';
import { AdPreview } from '@/components/ads/AdBlock';
import Link from '@/components/ui/Link';
import { CUSTOM_MAX, CUSTOM_MIN, CUSTOM_RATE_CENTS, dollars, exampleTracking, MONTHLY_PLAN, perThousand, SPONSORED_PACKAGES } from '@/lib/sponsoredAds';
import { AdChart } from '../(account)/profile/ads/AdChart';

export const metadata: Metadata = {
  title: 'Advertise on Chronopin',
  description: 'Put your ad next to the pins people follow. Pay once for a fixed number of views from $5 for 1,000, or subscribe for 15,000 views a month for $20.',
};

const PLACEMENTS = [
  {
    title: 'The timeline',
    text: 'Between the days people scroll to see what is coming and what just happened.',
  },
  {
    title: 'Pin pages',
    text: 'Beside the event, release or launch a reader is already looking at.',
  },
  {
    title: 'Guides and lists',
    text: 'In restaurant, product and car guides, and the side panel and menu.',
  },
];

const STEPS = [
  {
    title: 'Write your ad',
    text: 'A headline, a line of text, a link and an optional picture.',
  },
  {
    title: 'Choose a plan',
    text: 'Buy a set number of views once, or take the monthly plan. Pay by card; a one-off ad never renews.',
  },
  {
    title: 'We review it',
    text: 'Ads are checked by a person and go live within 24 hours at the latest.',
  },
  {
    title: 'Watch it work',
    text: 'See views, unique people and clicks per day, and set a daily cap if you want to spread it out.',
  },
];

// The public page for advertisers: static, so it takes no query. The portal
// (buying, editing and tracking ads) is the Ads tab of the profile, which asks
// signed-out visitors to sign in first; pricing cards link there with ?plan=.
export default function AdvertiseLanding() {
  const bought = 5000;
  const sample = exampleTracking(bought);
  const ctr = ((sample.clicks / sample.impressions) * 100).toFixed(2);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6">
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-line bg-raised px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-accent/10 blur-3xl" />
        <p className="relative mb-3 text-xs font-semibold tracking-wider text-accent uppercase">Advertise on Chronopin</p>
        <h1 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Put your business in front of people who follow what&apos;s next
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">
          Your ad sits beside the pins people already care about. Buy a fixed number of views or subscribe monthly, and see exactly how it does.
        </p>
        <p className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/profile/ads" className="btn btn-primary">
            Create an ad
          </Link>
          <a href="#pricing" className="btn btn-secondary">
            See pricing
          </a>
        </p>
      </section>

      <section aria-labelledby="where" className="mb-14">
        <h2 id="where" className="mb-1 font-display text-2xl font-semibold tracking-tight">
          Where it shows
        </h2>
        <p className="mb-5 text-subtle">The same ad appears in every place readers look.</p>
        <ul className="grid gap-4 sm:grid-cols-3">
          {PLACEMENTS.map((p) => (
            <li key={p.title} className="surface p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-subtle">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="see" className="mb-14 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="see" className="mb-1 font-display text-2xl font-semibold tracking-tight">
            A sample ad
          </h2>
          <p className="mb-4 text-sm text-subtle">A headline, a line of text and a picture, shown the way readers see it.</p>
          <AdPreview title="Sample Bagel Shop" body="Fresh bagels baked every morning, a block from the park." url="https://example.com" imageUrl="/ads/example-bagels.png" />
        </div>
        <div>
          <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">A sample live report</h2>
          <p className="mb-4 text-sm text-subtle">
            A {bought.toLocaleString('en-US')}-view package ({dollars(SPONSORED_PACKAGES[1].priceCents)}), two weeks in. Example numbers.
          </p>
          <div className="surface space-y-4 p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Views', `${sample.impressions.toLocaleString('en-US')} / ${bought.toLocaleString('en-US')}`],
                ['Unique people', sample.uniques.toLocaleString('en-US')],
                ['Clicks', sample.clicks.toLocaleString('en-US')],
                ['Click rate', `${ctr}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-raised-2 p-3">
                  <dt className="text-subtle">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <AdChart days={sample.byDay} />
            <p className="text-xs text-subtle">Example only, not real results.</p>
          </div>
        </div>
      </section>

      <section id="pricing" aria-labelledby="pricing-h" className="mb-14 scroll-mt-20">
        <h2 id="pricing-h" className="mb-1 font-display text-2xl font-semibold tracking-tight">
          Pricing
        </h2>
        <p className="mb-5 text-subtle">
          Pay once for a package, or subscribe monthly. A one-off ad stops by itself when the bought views are used; set a daily maximum to make it last.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SPONSORED_PACKAGES.map((pkg) => (
            <li key={pkg.impressions}>
              <Link
                href={`/profile/ads?plan=${pkg.impressions}`}
                className="surface block h-full p-6 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent"
              >
                <p className="font-display text-3xl font-semibold">{dollars(pkg.priceCents)}</p>
                <p className="mt-1 font-medium">{pkg.impressions.toLocaleString('en-US')} views</p>
                <p className="text-sm text-subtle">{perThousand(pkg)} per 1,000</p>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/profile/ads?plan=monthly"
              className="surface block h-full bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-6 ring-2 ring-amber-500/60 transition-shadow hover:shadow-md"
            >
              <p className="mb-2 text-xs font-semibold tracking-wider text-warning uppercase">Best value &middot; Monthly</p>
              <p className="font-display text-3xl font-semibold">
                {dollars(MONTHLY_PLAN.priceCents)}
                <span className="text-base font-normal text-subtle"> / month</span>
              </p>
              <p className="mt-1 font-medium">{MONTHLY_PLAN.impressions.toLocaleString('en-US')} views a month</p>
              <p className="text-sm text-subtle">{perThousand(MONTHLY_PLAN)} per 1,000</p>
              <p className="text-sm text-subtle">Renews monthly. Cancel any time.</p>
            </Link>
          </li>
          <li>
            <Link href="/profile/ads?plan=custom" className="surface block h-full p-6 transition-shadow hover:shadow-md">
              <p className="mb-2 text-xs font-semibold tracking-wider text-subtle uppercase">Custom</p>
              <p className="font-display text-3xl font-semibold">{dollars(CUSTOM_RATE_CENTS)}</p>
              <p className="mt-1 font-medium">per 1,000 views</p>
              <p className="text-sm text-subtle">
                {CUSTOM_MIN.toLocaleString('en-US')} to {CUSTOM_MAX.toLocaleString('en-US')} views
              </p>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="how" className="mb-14">
        <h2 id="how" className="mb-5 font-display text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface flex gap-4 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">{i + 1}</span>
              <span>
                <span className="block font-semibold">{s.title}</span>
                <span className="text-sm text-subtle">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-raised px-6 py-10 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Ready when you are</h2>
        <p className="mx-auto mt-2 max-w-md text-subtle">
          Write your ad in a couple of minutes. Nothing goes live until it is paid for and reviewed, and a review takes 24 hours at most.
        </p>
        <p className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/profile/ads" className="btn btn-primary">
            Create an ad
          </Link>
          <Link href="/contact" className="btn btn-secondary">
            Ask us a question
          </Link>
        </p>
      </section>
    </main>
  );
}
