'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import type { PinJson } from '@/lib/types';

// Watch (favourite) a pin. The count comes back from the server, so
// concurrent watchers stay accurate.
// loadForViewer: the pin came from a cached page shared by every visitor, so
// whether this viewer watches it is fetched once they are known.
export function WatchButton({
  pin,
  loadForViewer,
}: {
  pin: Pick<PinJson, 'id' | 'hasFavorite' | 'favoriteCount'>;
  loadForViewer?: boolean;
}) {
  const router = useRouter();
  const { isLoggedIn, status } = useSession();
  const [watching, setWatching] = useState(!!pin.hasFavorite);
  const [count, setCount] = useState(pin.favoriteCount ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loadForViewer || !isLoggedIn) return;
    let cancelled = false;
    api
      .get<PinJson>(`/api/pins/${pin.id}`)
      .then((fresh) => {
        if (cancelled) return;
        setWatching(!!fresh.hasFavorite);
        setCount(fresh.favoriteCount ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadForViewer, isLoggedIn, pin.id]);

  async function toggle() {
    if (!isLoggedIn) {
      if (status === 'ready') router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    const next = !watching;
    setBusy(true);
    setWatching(next);
    try {
      const updated = next
        ? await api.post<PinJson>(`/api/pins/${pin.id}/favorite`)
        : await api.delete<PinJson>(`/api/pins/${pin.id}/favorite`);
      setCount(updated.favoriteCount ?? 0);
      setWatching(!!updated.hasFavorite);
    } catch {
      setWatching(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watching}
      aria-label={`${watching ? 'Stop watching' : 'Watch this pin'} (${count} watching)`}
      title={watching ? 'Stop watching' : 'Watch this pin'}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm ${watching ? 'text-link' : 'text-subtle hover:text-ink'}`}
    >
      <Icon name="eye" className="size-4" />
      <span>{count}</span>
    </button>
  );
}
