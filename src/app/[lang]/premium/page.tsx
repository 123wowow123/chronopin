import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { getUser } from '@/server/auth';
import PremiumSubscription from '@/server/model/premiumSubscription';
import TraderPosition from '@/server/model/traderPosition';
import { stripeConfigured } from '@/server/stripe';
import { personPath } from '@/lib/people';
import * as db from '@/server/db';
import { PremiumPlan } from './PremiumPlan';

export const metadata: Metadata = {
  title: 'Premium',
  description: 'Follow well-known investors’ disclosed trades with estimated PnL, summarized reasoning and live alerts.',
};

// The landing page the "Go premium" prompts on /person pages point to.
export default async function PremiumPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const [query, user, traders] = await Promise.all([searchParams, getUser(), TraderPosition.counts()]);
  const people = new Set((await db.query<{ name: string }>(`SELECT "name"::text FROM "Person" WHERE "name"::text = ANY($1)`, [traders.map((t) => t.traderName)])).map((p) => p.name));
  const plan = user ? await PremiumSubscription.status(user.id) : null;
  const perks = [
    ['Portfolio moves', 'Every disclosed buy, sell and hold from the investors we follow, summarized in our words and linked to the source.'],
    ['Estimated PnL', 'How each opening trade has moved since its trade date, from market closes. Options are marked by the underlying.'],
    ['Live alerts', 'A push notification when a new move is disclosed, even with the site closed.'],
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-20 sm:px-6">
      <section className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-wider text-accent uppercase">Premium · $20 / month</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Follow the portfolios worth following</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Cancel any time. Unlocks the premium sections on people pages, with more to come.</p>
      </section>
      <ul className="mb-10 grid gap-4 sm:grid-cols-3">
        {perks.map(([title, text]) => (
          <li key={title} className="surface p-5">
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <PremiumPlan
        active={plan?.active ?? false}
        endsOn={plan?.currentPeriodEnd ? plan.currentPeriodEnd.slice(0, 10) : null}
        cancelling={plan?.cancelAtPeriodEnd ?? false}
        paid={query.paid === '1'}
        configured={stripeConfigured()}
      />
      {traders.length ? (
        <section className="mt-12">
          <h2 className="mb-3 text-lg font-semibold">Investors tracked</h2>
          <ul className="flex flex-wrap gap-2">
            {traders.map((t) => (
              <li key={t.traderSlug} className="rounded-full bg-raised px-3 py-1 text-sm ring-1 ring-inset ring-line">
                {people.has(t.traderName) ? <Link href={personPath(t.traderName)}>{t.traderName} · {t.positions}</Link> : `${t.traderName} · ${t.positions}`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
