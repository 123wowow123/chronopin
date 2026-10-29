'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';

type Status = { watcherCount: number; watching: boolean };

// Register for every stock trade alert: each new filing by any person lands in
// the bell. TradeWatchButton does the same for one person.
export function WatchAllTradesButton() {
  const router = useRouter();
  const { isLoggedIn, status: sessionStatus, user } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const acted = useRef(false);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    if (sessionStatus !== 'ready') return;
    api
      .get<Status>('/api/people/trade-watch')
      .then((s) => !cancelled && !acted.current && setStatus(s))
      .catch(() => !cancelled && !acted.current && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, user?.id]);

  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'watchAllTrades', id: 0 },
    isLoggedIn,
    useCallback(() => {
      acted.current = true;
      return api.post<Status>('/api/people/trade-watch').then(setStatus);
    }, []),
  );

  async function toggle() {
    if (!isLoggedIn) {
      if (sessionStatus === 'ready') {
        savePendingAction({ kind: 'watchAllTrades', id: 0 });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy || !status) return;
    acted.current = true;
    setBusy(true);
    try {
      setStatus(status.watching ? await api.delete<Status>('/api/people/trade-watch') : await api.post<Status>('/api/people/trade-watch'));
    } finally {
      setBusy(false);
    }
  }

  const watching = !!status?.watching;
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      disabled={busy || sessionStatus !== 'ready' || (isLoggedIn && !status)}
      aria-pressed={watching}
      title={watching ? t('person.trades.unwatchAllHint') : t('person.trades.watchAllHint')}
      className={`group btn rounded-full px-4 py-1.5 ${watching ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
    >
      <Icon name="eye" className="size-4" />
      {watching ? (
        <>
          <span className="group-hover:hidden">{t('person.trades.watchingAll')}</span>
          <span className="hidden group-hover:inline">{t('person.trades.unwatch')}</span>
        </>
      ) : (
        t('person.trades.watchAll')
      )}
    </button>
  );
}
