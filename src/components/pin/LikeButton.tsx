'use client';

import { useRouter } from '@/lib/client/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useCountBump } from '@/lib/client/countBump';
import { onLive } from '@/lib/client/liveFeed';
import { onLikedChange, setLiked, useLiked } from '@/lib/client/liked';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';
import type { PinJson } from '@/lib/types';

// Like a pin. Built like WatchButton: the count comes back from the server and
// follows everyone else's likes live.
// loadForViewer: the pin came from a cached page shared by every visitor, so
// whether this viewer likes it is fetched once they are known.
export function LikeButton({
  pin,
  loadForViewer,
}: {
  pin: Pick<PinJson, 'id' | 'hasLike' | 'likeCount'>;
  loadForViewer?: boolean;
}) {
  const router = useRouter();
  const { isLoggedIn, status } = useSession();
  // null: a landing-page card knows no count, so none is shown until an answer
  // from the server (or this viewer's own click) gives one.
  const [count, setCount] = useState<number | null>(pin.likeCount ?? null);
  const [busy, setBusy] = useState(false);
  const countRef = useCountBump<HTMLSpanElement>(count ?? 0);
  // Set once this viewer likes or unlikes here, so an answer already on its
  // way does not put back what they have just changed.
  const acted = useRef(false);
  const t = useT();
  const [chosen, setChosen] = useState<boolean | null>(null);
  const shared = pin.hasLike === undefined && !loadForViewer;
  const viewerLikes = useLiked(shared ? pin.id : undefined);
  const liked = chosen ?? viewerLikes ?? !!pin.hasLike;

  useEffect(() => {
    if (!loadForViewer || !isLoggedIn) return;
    let cancelled = false;
    api
      .get<PinJson>(`/api/pins/${pin.id}`)
      .then((fresh) => {
        if (cancelled || acted.current) return;
        setChosen(!!fresh.hasLike);
        setCount(fresh.likeCount ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadForViewer, isLoggedIn, pin.id]);

  // This viewer's like made on another card of the same pin.
  useEffect(
    () =>
      onLikedChange((id, value) => {
        if (id !== pin.id) return;
        acted.current = true;
        setChosen(value);
      }),
    [pin.id],
  );

  // Only the count: a broadcast is someone else's like, not this viewer's.
  useEffect(() => {
    const follow = (changed: { id?: number; likeCount?: number }) => {
      if (changed.id === pin.id && typeof changed.likeCount === 'number') setCount(changed.likeCount);
    };
    const stops = ['pin:like', 'pin:unlike'].map((type) => onLive(type, follow));
    return () => stops.forEach((stop) => stop());
  }, [pin.id]);

  const applyPin = useCallback(
    (updated: PinJson) => {
      setCount(updated.likeCount ?? 0);
      setChosen(!!updated.hasLike);
      if (pin.id) setLiked(pin.id, !!updated.hasLike);
    },
    [pin.id],
  );

  // The like that sent the reader off to log in finishes once they are back.
  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'like', id: pin.id },
    isLoggedIn,
    useCallback(() => {
      acted.current = true;
      return api.post<PinJson>(`/api/pins/${pin.id}/like`).then(applyPin);
    }, [pin.id, applyPin]),
  );

  async function like(next: boolean) {
    acted.current = true;
    setBusy(true);
    setChosen(next);
    try {
      applyPin(next ? await api.post<PinJson>(`/api/pins/${pin.id}/like`) : await api.delete<PinJson>(`/api/pins/${pin.id}/like`));
    } catch {
      setChosen(!next);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (!isLoggedIn) {
      if (status === 'ready') {
        savePendingAction({ kind: 'like', id: pin.id });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy) return;
    void like(!liked);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      disabled={busy || status !== 'ready'}
      aria-pressed={liked}
      aria-label={`${liked ? t('like.stop') : t('like.start')} (${t('like.count', { count: count ?? 0 })})`}
      title={liked ? t('like.stop') : t('like.start')}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm tabular-nums cursor-pointer transition duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${liked ? 'bg-red-500/15 text-danger-soft hover:bg-red-500/25 active:bg-red-500/35' : 'text-subtle hover:bg-ink/10 hover:text-ink active:bg-ink/20'}`}
    >
      <Icon name="heart" className={`size-4 ${liked ? 'fill-current' : ''}`} />
      {count === null ? null : (
        <span ref={countRef} className="inline-block">
          {count}
        </span>
      )}
    </button>
  );
}
