'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { authHrefHere } from '@/lib/client/returnSpot';

// Buy or manage the premium plan. Signed-out visitors go to sign in first;
// paying and managing happen on Stripe's pages.
export function PremiumPlan({ active, endsOn, cancelling, paid, configured }: { active: boolean; endsOn: string | null; cancelling: boolean; paid: boolean; configured: boolean }) {
  const { status, user } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go(path: string) {
    setBusy(true);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, {});
      window.location.assign(url);
    } catch {
      setError('Could not reach checkout. Please try again.');
      setBusy(false);
    }
  }

  if (active || user?.premium) {
    return (
      <div className="surface mx-auto max-w-xl space-y-3 p-6 text-center" role="status">
        <p className="text-lg font-semibold">Premium is on{user?.role === 'admin' && !active ? ' (admin)' : ''}</p>
        {endsOn ? <p className="text-muted">{cancelling ? `Ends on ${endsOn}.` : `Renews on ${endsOn}.`}</p> : null}
        {active ? (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void go('/api/premium/portal')}>
            Manage plan
          </button>
        ) : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
    );
  }
  const signedOut = status === 'ready' && !user;
  return (
    <div className="mx-auto max-w-xl space-y-3 text-center">
      {paid ? <p className="surface p-4 text-success" role="status">Thanks. Premium turns on as soon as the payment clears; refresh in a moment.</p> : null}
      {signedOut ? (
        <a className="btn btn-primary" href={authHrefHere('/login')}>Sign in to go premium</a>
      ) : (
        <button type="button" className="btn btn-primary" disabled={busy || !configured} onClick={() => void go('/api/premium/checkout')}>
          {configured ? 'Go premium · $20 / month' : 'Premium opens soon'}
        </button>
      )}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
