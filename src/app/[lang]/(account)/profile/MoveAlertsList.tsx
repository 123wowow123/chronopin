'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { pinPath } from '@/lib/seo';
import type { MoveAlertRow } from '@/lib/moveAlerts';

// The Premium price and odds alerts the reader has set (from "Alert me" on a
// pin's odds or stocks), each with a button that turns it off, and a prompt
// to go Premium for those without the plan. Stock trades disclosed by people
// they follow are told in the same bell and browser alerts (listed below).
export function MoveAlertsList({ premium, initial }: { premium: boolean; initial: MoveAlertRow[] }) {
  const t = useT();
  const [alerts, setAlerts] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  async function turnOff(id: number) {
    setBusy(id);
    try {
      await api.delete(`/api/move-alerts/${id}`);
      setAlerts((list) => list.filter((a) => a.id !== id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="move-alerts-heading" className="surface px-4 py-4">
      <h2 id="move-alerts-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
        {t('moveAlerts.title')}
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{t('premium.title')}</span>
      </h2>
      <p className="mt-1 text-sm text-subtle">{t('moveAlerts.intro')}</p>
      {!premium ? (
        <p className="mt-3 text-sm">
          {t('moveAlerts.locked')}{' '}
          <Link href="/premium" className="font-semibold text-link">
            {t('premium.goPremium')}
          </Link>
        </p>
      ) : null}
      {alerts.length ? (
        <ul className="mt-3 divide-y divide-line">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {a.pinId ? (
                    <Link href={pinPath({ id: a.pinId, title: a.pinTitle ?? '' })} className="hover:text-link hover:no-underline">
                      {a.label}
                    </Link>
                  ) : (
                    a.label
                  )}
                </span>
                <span className="text-xs text-subtle">
                  {t(a.kind === 'market' ? 'moveAlerts.ruleMarket' : 'moveAlerts.ruleStock', { amount: a.threshold })}
                </span>
              </span>
              <button type="button" disabled={busy === a.id} onClick={() => turnOff(a.id)} className="btn btn-secondary rounded-full px-4 py-1.5 hover:text-danger-soft">
                {t('moveAlerts.off')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-subtle">{t('moveAlerts.empty')}</p>
      )}
      <p className="mt-3 text-xs text-subtle">{t('moveAlerts.tradesNote')}</p>
    </section>
  );
}
