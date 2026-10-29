'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { enableAlerts } from '@/lib/client/browserAlerts';
import { useSession } from '@/lib/client/session';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
import { authHrefHere } from '@/lib/client/returnSpot';
import { setWatched } from '@/lib/client/watched';
import { useT } from '@/lib/client/i18n';

type ThreadWatchJson = { watching: boolean; pinIds?: number[] };

// Watch a whole thread, beside its heading on the pin page: every pin in it,
// and each response that joins it later. The page is cached for everyone, so
// whether this viewer watches it is asked once they are known.
export function ThreadWatchButton({ pinId }: { pinId: number }) {
  const router = useRouter();
  const { isLoggedIn, status } = useSession();
  const t = useT();
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set once the viewer clicks, so a lookup already on its way does not undo it.
  const acted = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    api
      .get<ThreadWatchJson>(`/api/pins/${pinId}/thread-watch`)
      .then((fresh) => {
        if (!cancelled && !acted.current) setWatching(fresh.watching);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, pinId]);

  // Resume with an explicit watch, even if the viewer lookup already says
  // this thread is watched. Replaying a toggle could undo the original intent.
  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'watchThread', id: pinId },
    isLoggedIn,
    () => watch(true),
  );

  async function watch(next: boolean) {
    acted.current = true;
    setBusy(true);
    setWatching(next);
    try {
      const answer = next
        ? await api.post<ThreadWatchJson>(`/api/pins/${pinId}/thread-watch`)
        : await api.delete<ThreadWatchJson>(`/api/pins/${pinId}/thread-watch`);
      setWatching(answer.watching);
      // So the page's own eye, and any card of these pins, agree.
      answer.pinIds?.forEach((id) => setWatched(id, answer.watching));
    } catch {
      setWatching(!next);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (!isLoggedIn) {
      if (status === 'ready') {
        savePendingAction({ kind: 'watchThread', id: pinId });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy) return;
    // Asked during the click; login replay does not have a browser gesture.
    if (!watching) void enableAlerts();
    void watch(!watching);
  }

  const label = watching ? t('watch.stopThread') : t('watch.startThread');
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      disabled={busy || status !== 'ready'}
      aria-pressed={watching}
      aria-label={label}
      title={label}
      className={`inline-flex items-center rounded-md p-1 cursor-pointer transition duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${watching ? 'bg-accent/15 text-link hover:bg-accent/25 active:bg-accent/35' : 'text-subtle hover:bg-ink/10 hover:text-ink active:bg-ink/20'}`}
    >
      <Icon name="eye" className="size-4" />
    </button>
  );
}
