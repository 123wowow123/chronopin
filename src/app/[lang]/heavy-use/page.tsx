import { soft } from '@/server/util/soft';
import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { getT } from '@/lib/i18n/server';
import type { MessageKey } from '@/lib/i18n/translate';
import { getUser } from '@/server/auth';
import HeavyUserPlan from '@/server/model/heavyUserPlan';
import { stripeConfigured } from '@/server/stripe';
import { HeavyPlans } from './HeavyPlans';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('heavy.metaTitle'),
    description: t('heavy.metaDescription'),
    robots: { index: false, follow: false },
  };
}

// The page a visitor is shown when they ask for pages faster than the request
// limit allows (src/proxy.ts rewrites to it with a 429), and where the
// "Heavy user" ad tile points. Reachable by anyone, never indexed.
export default async function HeavyUse({ searchParams }: { searchParams: Promise<{ limited?: string; paid?: string; region?: string }> }) {
  const [query, user, t] = await Promise.all([searchParams, getUser(), getT()]);
  const plan = user ? await soft(HeavyUserPlan.status(user.id), null, 'heavy plan status') : null;
  const limited = query.limited === '1';
  const perks = [1, 2, 3].map((n) => ({
    title: t(`heavy.perk${n}Title` as MessageKey),
    text: t(`heavy.perk${n}Text` as MessageKey),
  }));
  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6">
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-line bg-raised px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-accent/10 blur-3xl" />
        <p className="relative mb-3 text-xs font-semibold tracking-wider text-accent uppercase">{limited ? t('heavy.eyebrowLimited') : t('heavy.eyebrow')}</p>
        <h1 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {limited ? t('heavy.headingLimited') : t('heavy.heading')}
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">{limited ? t('heavy.introLimited') : t('heavy.intro')}</p>
        {limited && !user && query.region !== '1' ? (
          <p className="relative mx-auto mt-4 max-w-xl rounded-lg bg-accent/10 px-3 py-2 text-sm ring-1 ring-accent/20 ring-inset">
            {t.rich('account.higherLimits', {
              login: (chunks) => (
                <Link href="/login?redirect=%2F" className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
              signup: (chunks) => (
                <Link href="/signup?redirect=%2F" className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : null}
        {limited ? (
          <p className="relative mt-6">
            <Link href="/" className="btn btn-secondary">
              {t('heavy.tryAgain')}
            </Link>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="plans" className="mb-14">
        <h2 id="plans" className="mb-5 text-center font-display text-2xl font-semibold tracking-tight">
          {t('heavy.choosePay')}
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
          {t('heavy.whatYouGet')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {perks.map((p) => (
            <li key={p.title} className="surface p-5">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-subtle">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="mb-5 font-display text-2xl font-semibold tracking-tight">
          {t('heavy.questions')}
        </h2>
        <dl className="space-y-4 text-sm">
          {[1, 2, 3, 4].map((n) => (
            <div key={n}>
              <dt className="font-semibold">{t(`heavy.faq${n}q` as MessageKey)}</dt>
              <dd className="mt-1 text-subtle">{t(`heavy.faq${n}a` as MessageKey)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
