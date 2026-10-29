'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';

type Status = { personId: number; watcherCount: number; watching: boolean };

// Watch a person's stock trades: each new filing then lands in the bell (and
// as a browser notification where the reader allowed them). The status is
// asked for per viewer, because the page itself is cached for everyone.
export function TradeWatchButton({ personId, name }: { personId: number; name: string }) {
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
      .get<Status>(`/api/people/${personId}/trade-watch`)
      .then((s) => !cancelled && !acted.current && setStatus(s))
      .catch(() => !cancelled && !acted.current && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [personId, sessionStatus, user?.id]);

  // The click that sent the reader off to sign in finishes when they return.
  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'watchTrades', id: personId },
    isLoggedIn,
    useCallback(() => {
      acted.current = true;
      return api.post<Status>(`/api/people/${personId}/trade-watch`).then(setStatus);
    }, [personId]),
  );

  async function toggle() {
    if (!isLoggedIn) {
      if (sessionStatus === 'ready') {
        savePendingAction({ kind: 'watchTrades', id: personId });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy || !status) return;
    acted.current = true;
    setBusy(true);
    try {
      setStatus(status.watching ? await api.delete<Status>(`/api/people/${personId}/trade-watch`) : await api.post<Status>(`/api/people/${personId}/trade-watch`));
    } finally {
      setBusy(false);
    }
  }

  const watching = !!status?.watching;
  return (
    <span className="flex flex-wrap items-center gap-3">
      {status && status.watcherCount > 0 ? <span className="text-xs text-muted">{t('person.trades.watchers', { count: status.watcherCount })}</span> : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={busy || sessionStatus !== 'ready' || (isLoggedIn && !status)}
        aria-pressed={watching}
        title={watching ? t('person.trades.unwatchHint', { name }) : t('person.trades.watchHint', { name })}
        className={`group btn rounded-full px-4 py-1.5 ${watching ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
      >
        <Icon name="eye" className="size-4" />
        {watching ? (
          <>
            <span className="group-hover:hidden">{t('person.trades.watching')}</span>
            <span className="hidden group-hover:inline">{t('person.trades.unwatch')}</span>
          </>
        ) : (
          t('person.trades.watch')
        )}
      </button>
    </span>
  );
}
