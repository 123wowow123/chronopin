import { soft } from '@/server/util/soft';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import Link from '@/components/ui/Link';
import { getUser } from '@/server/auth';
import PremiumSubscription from '@/server/model/premiumSubscription';
import TraderPosition from '@/server/model/traderPosition';
import { stripeConfigured } from '@/server/stripe';
import { personPath } from '@/lib/people';
import { getT } from '@/lib/i18n/server';
import * as db from '@/server/db';
import { PremiumPlan } from './PremiumPlan';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('premium.title'), description: t('premium.description') };
}

// The landing page the "Go premium" prompts on /person pages point to.
export default async function PremiumPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  await connection();
  const t = await getT();
  const [query, user, traders] = await Promise.all([searchParams, getUser(), TraderPosition.counts()]);
  const people = new Set((await db.query<{ name: string }>(`SELECT "name"::text FROM "Person" WHERE "name"::text = ANY($1)`, [traders.map((t) => t.traderName)])).map((p) => p.name));
  const plan = user ? await soft(PremiumSubscription.status(user.id), null, 'premium status') : null;
  const perks = [
    [t('premium.perkMovesTitle'), t('premium.perkMovesText')],
    [t('premium.perkPnlTitle'), t('premium.perkPnlText')],
    [t('premium.perkAlertsTitle'), t('premium.perkAlertsText')],
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-20 sm:px-6">
      <section className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold tracking-wider text-accent uppercase">{t('premium.eyebrow')}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t('premium.heroTitle')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t('premium.heroSub')}</p>
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
          <h2 className="mb-3 text-lg font-semibold">{t('premium.investors')}</h2>
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
