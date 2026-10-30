'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { removeMoveAlert, saveMoveAlert, useMoveAlerts } from '@/lib/client/moveAlerts';
import { useSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';
import { DEFAULT_THRESHOLD, THRESHOLD_CHOICES, type MoveKind } from '@/lib/moveAlerts';

// "Alert me" on a market's odds or a stock on a pin (Premium): pick how far it
// must move and the server tells you when it has (services/moveAlerts.ts).
// Markets move in points of chance, stocks in percent of price. Signed-out
// readers see nothing; readers without Premium see the button leading to the plan.
export function MoveAlertButton({ pinId, kind, subject }: { pinId: number; kind: MoveKind; subject: string }) {
  const t = useT();
  const { isLoggedIn } = useSession();
  const { ready, premium, alerts } = useMoveAlerts(pinId, isLoggedIn);
  const [open, setOpen] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD[kind]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!isLoggedIn || !ready) return null;

  const current = alerts.find((a) => a.kind === kind && a.subject === subject);
  const unit = kind === 'market' ? t('moveAlerts.points') : '%';

  if (!premium) {
    return (
      <Link href="/premium" title={t('moveAlerts.locked')} className="inline-flex items-center gap-1 text-subtle hover:text-link hover:no-underline">
        <Icon name="bell" className="size-3" />
        {t('moveAlerts.add')}
      </Link>
    );
  }

  async function save() {
    setBusy(true);
    setError(false);
    try {
      await saveMoveAlert(pinId, { kind, ...(kind === 'market' ? { market: subject } : { symbol: subject }), threshold });
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!current) return;
    setBusy(true);
    setError(false);
    try {
      await removeMoveAlert(pinId, current.id);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setThreshold(current?.threshold ?? DEFAULT_THRESHOLD[kind]);
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1 hover:text-link ${current ? 'font-semibold text-link' : 'text-subtle'}`}
      >
        <Icon name="bell" className="size-3" />
        {current ? t('moveAlerts.active', { amount: `${current.threshold}${unit === '%' ? '%' : ` ${unit}`}` }) : t('moveAlerts.add')}
      </button>
      {open ? (
        <span className="inline-flex flex-wrap items-center gap-2 text-ink">
          <label className="inline-flex items-center gap-1.5">
            <span className="sr-only">{t(kind === 'market' ? 'moveAlerts.morePoints' : 'moveAlerts.morePercent')}</span>
            <span aria-hidden>±</span>
            <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="rounded border border-line bg-paper px-1.5 py-0.5">
              {[...new Set([...THRESHOLD_CHOICES[kind], threshold])].sort((a, b) => a - b).map((n) => (
                <option key={n} value={n}>
                  {n}
                  {kind === 'market' ? ` ${unit}` : '%'}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={save} className="btn btn-primary px-2.5 py-0.5 text-xs">
            {t('moveAlerts.save')}
          </button>
          {current ? (
            <button type="button" disabled={busy} onClick={turnOff} className="text-xs text-subtle hover:text-danger-soft">
              {t('moveAlerts.off')}
            </button>
          ) : null}
          {error ? <span role="alert" className="text-xs text-danger">{t('duplicates.saveFailed')}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
