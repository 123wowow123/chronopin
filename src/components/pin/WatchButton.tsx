'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useCountBump } from '@/lib/client/countBump';
import { onLive } from '@/lib/client/liveFeed';
import { useSession } from '@/lib/client/session';
import { authHrefHere } from '@/lib/client/returnSpot';
import { setWatched, useWatched } from '@/lib/client/watched';
import type { PinJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';

// Watch (favourite) a pin. The count comes back from the server, so
// concurrent watchers stay accurate, and follows everyone else's watching
// live, wherever the card is shown.
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
  const [count, setCount] = useState(pin.favoriteCount ?? 0);
  const [busy, setBusy] = useState(false);
  const countRef = useCountBump<HTMLSpanElement>(count);
  const t = useT();
  // What this viewer has been told, or has just done, about watching this
  // pin; null until either happens.
  const [chosen, setChosen] = useState<boolean | null>(null);
  // A card off a cached page arrives with no hasFavorite at all (rather than
  // a false), and is looked up with the rest of its page in one request.
  const shared = pin.hasFavorite === undefined && !loadForViewer;
  const viewerWatches = useWatched(shared ? pin.id : undefined);
  const watching = chosen ?? viewerWatches ?? !!pin.hasFavorite;

  useEffect(() => {
    if (!loadForViewer || !isLoggedIn) return;
    let cancelled = false;
    api
      .get<PinJson>(`/api/pins/${pin.id}`)
      .then((fresh) => {
        if (cancelled) return;
        setChosen(!!fresh.hasFavorite);
        setCount(fresh.favoriteCount ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadForViewer, isLoggedIn, pin.id]);

  // Only the count: a broadcast is someone else's watch, not this viewer's.
  useEffect(() => {
    const follow = (changed: { id?: number; favoriteCount?: number }) => {
      if (changed.id === pin.id && typeof changed.favoriteCount === 'number') setCount(changed.favoriteCount);
    };
    const stops = ['pin:favorite', 'pin:unfavorite'].map((type) => onLive(type, follow));
    return () => stops.forEach((stop) => stop());
  }, [pin.id]);

  async function toggle() {
    if (!isLoggedIn) {
      if (status === 'ready') router.push(authHrefHere());
      return;
    }
    if (busy) return;
    const next = !watching;
    setBusy(true);
    setChosen(next);
    try {
      const updated = next
        ? await api.post<PinJson>(`/api/pins/${pin.id}/favorite`)
        : await api.delete<PinJson>(`/api/pins/${pin.id}/favorite`);
      setCount(updated.favoriteCount ?? 0);
      setChosen(!!updated.hasFavorite);
      // So the pin's other cards, and its page, agree without asking again.
      if (pin.id) setWatched(pin.id, !!updated.hasFavorite);
    } catch {
      setChosen(watching);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watching}
      aria-label={`${watching ? t('watch.stop') : t('watch.start')} (${t('watch.count', { count })})`}
      title={watching ? t('watch.stop') : t('watch.start')}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums transition-colors ${watching ? 'bg-accent/15 text-link' : 'text-subtle hover:bg-raised hover:text-ink'}`}
    >
      <Icon name="eye" className="size-4" />
      <span ref={countRef} className="inline-block">
        {count}
      </span>
    </button>
  );
}
