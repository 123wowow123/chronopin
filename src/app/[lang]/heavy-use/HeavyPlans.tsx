'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';

type Plan = 'month' | 'subscription';

// The two ways to buy, and the state of a plan already bought. Signed-out
// visitors are sent to sign in first and come back here; paying and managing
// happen on Stripe's pages (the API answers with the address).
export function HeavyPlans({
  active,
  plan,
  endsOn,
  cancelling,
  paid,
  configured,
}: {
  active: boolean;
  plan: Plan | null;
  // The day the paid time ends, as YYYY-MM-DD.
  endsOn: string | null;
  cancelling: boolean;
  paid: boolean;
  configured: boolean;
}) {
  const { status, user } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const signedOut = status === 'ready' && !user;

  async function go(path: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, body);
      window.location.assign(url);
    } catch {
      setError('Something went wrong starting checkout. Please try again in a moment.');
      setBusy(null);
    }
  }

  const options: { plan: Plan; name: string; price: string; unit: string; points: string[]; featured?: boolean }[] = [
    { plan: 'month', name: 'One month', price: '$5', unit: 'once, no renewal', points: ['30 days of unlimited reading', 'No ads', 'Pay once, nothing to cancel'] },
    {
      plan: 'subscription',
      name: 'Monthly',
      price: '$4',
      unit: 'a month',
      points: ['Unlimited reading, every month', 'No ads', 'Cancel any time'],
      featured: true,
    },
  ];

  if (active) {
    return (
      <section className="surface mx-auto max-w-xl space-y-3 p-6 text-center" role="status">
        <h2 className="font-display text-2xl font-semibold tracking-tight">You&apos;re a heavy user. Thank you.</h2>
        <p className="text-muted">
          Ads are off and your reading limit is lifted
          {endsOn ? (cancelling || plan === 'month' ? `. It runs until ${endsOn}.` : `. Your plan renews on ${endsOn}.`) : '.'}
        </p>
        <p className="flex flex-wrap justify-center gap-3">
          {plan === 'month' || cancelling ? (
            <button type="button" className="btn btn-primary" disabled={busy !== null || !configured} onClick={() => void go('/api/billing/heavy/checkout', { plan: 'month' }, 'month')}>
              Add 30 more days for $5
            </button>
          ) : null}
          {plan === 'subscription' ? (
            <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void go('/api/billing/heavy/portal', {}, 'portal')}>
              Manage plan
            </button>
          ) : null}
          <Link href="/" className="btn btn-secondary">
            Back to the timeline
          </Link>
        </p>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </section>
    );
  }

  return (
    <div>
      {paid ? (
        <p className="surface mx-auto mb-6 max-w-xl p-4 text-center text-success" role="status">
          Thank you! Your payment went through. It can take a minute to switch on; refresh if the limit is still showing.
        </p>
      ) : null}
      <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.plan} className={`surface relative flex flex-col p-6 ${o.featured ? 'ring-2 ring-accent' : ''}`}>
            {o.featured ? <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">Best value</span> : null}
            <h3 className="font-semibold">{o.name}</h3>
            <p className="mt-2">
              <span className="font-display text-4xl font-semibold tabular-nums">{o.price}</span> <span className="text-subtle">{o.unit}</span>
            </p>
            <ul className="mt-4 mb-6 flex-1 space-y-1.5 text-sm text-muted">
              {o.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden className="text-accent">✓</span>
                  {point}
                </li>
              ))}
            </ul>
            {signedOut ? (
              <Link href="/login?redirect=%2Fheavy-use" prefetch={false} className={`btn ${o.featured ? 'btn-primary' : 'btn-secondary'}`}>
                Sign in to continue
              </Link>
            ) : (
              <button
                type="button"
                className={`btn ${o.featured ? 'btn-primary' : 'btn-secondary'}`}
                disabled={busy !== null || !configured || status !== 'ready'}
                onClick={() => void go('/api/billing/heavy/checkout', { plan: o.plan }, o.plan)}
              >
                {busy === o.plan ? 'Opening checkout…' : configured ? `Get ${o.name.toLowerCase()}` : 'Coming soon'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-4 text-center text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
