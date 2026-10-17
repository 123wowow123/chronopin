import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { getUser } from '@/server/auth';
import HeavyUserPlan from '@/server/model/heavyUserPlan';
import { stripeConfigured } from '@/server/stripe';
import { HeavyPlans } from './HeavyPlans';

export const metadata: Metadata = {
  title: 'Heavy user plan',
  description: 'Read as much of Chronopin as you like, with no ads. $5 for 30 days, or $4 a month.',
  robots: { index: false, follow: false },
};

const PERKS = [
  { title: 'No limit on reading', text: 'Open as many pins, guides and lists as you like without being slowed down. A light limit still keeps the site fair for everyone.' },
  { title: 'No ads', text: 'Every ad block disappears while your plan is on, for the whole account.' },
  { title: 'Keeps the site running', text: 'Heavy reading costs real servers. The plan pays for it so the site stays open for everyone else.' },
];

// The page a visitor is shown when they ask for pages faster than the request
// limit allows (src/proxy.ts rewrites to it with a 429), and where the
// "Heavy user" ad tile points. Reachable by anyone, never indexed.
export default async function HeavyUse({ searchParams }: { searchParams: Promise<{ limited?: string; paid?: string }> }) {
  const [query, user] = await Promise.all([searchParams, getUser()]);
  const plan = user ? await HeavyUserPlan.status(user.id) : null;
  const limited = query.limited === '1';
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6">
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-line bg-raised px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-accent/10 blur-3xl" />
        <p className="relative mb-3 text-xs font-semibold tracking-wider text-accent uppercase">{limited ? 'You are reading very fast' : 'Heavy user plan'}</p>
        <h1 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {limited ? 'Slow down a little, or read without limits' : 'Read Chronopin without limits'}
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">
          {limited
            ? 'You have made a lot of requests in a short time, so we paused them for a moment. Wait a few seconds and try again, or become a heavy user: unlimited reading and no ads.'
            : 'For people who read the timeline, guides and pins all day. Unlimited reading and no ads, from $4 a month.'}
        </p>
        {limited ? (
          <p className="relative mt-6">
            <Link href="/" className="btn btn-secondary">
              Try again in a moment
            </Link>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="plans" className="mb-14">
        <h2 id="plans" className="mb-5 text-center font-display text-2xl font-semibold tracking-tight">
          Choose how to pay
        </h2>
        <HeavyPlans
          active={!!plan?.active}
          plan={plan?.plan ?? null}
          endsOn={plan?.currentPeriodEnd ? plan.currentPeriodEnd.slice(0, 10) : null}
          cancelling={!!plan?.cancelAtPeriodEnd}
          paid={query.paid === '1'}
          configured={stripeConfigured()}
        />
      </section>

      <section aria-labelledby="perks" className="mb-14">
        <h2 id="perks" className="mb-5 font-display text-2xl font-semibold tracking-tight">
          What you get
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {PERKS.map((p) => (
            <li key={p.title} className="surface p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-subtle">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="mb-5 font-display text-2xl font-semibold tracking-tight">
          Questions
        </h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-semibold">Why was I stopped?</dt>
            <dd className="mt-1 text-subtle">Requests came from your account or network address faster than any person normally reads. Automated tools do this, and so do very keen readers.</dd>
          </div>
          <div>
            <dt className="font-semibold">Is there still a limit?</dt>
            <dd className="mt-1 text-subtle">Yes, a light one that a person can&apos;t reach by reading. It exists to keep the servers healthy for everyone.</dd>
          </div>
          <div>
            <dt className="font-semibold">Can I cancel?</dt>
            <dd className="mt-1 text-subtle">The $5 plan is paid once and never renews. The $4 plan can be cancelled in one click, and runs until the end of the month you paid for.</dd>
          </div>
          <div>
            <dt className="font-semibold">Building a tool or crawler?</dt>
            <dd className="mt-1 text-subtle">Automated scraping isn&apos;t what this plan is for. Please respect robots.txt and the crawl delay.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
