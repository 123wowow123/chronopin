'use client';

import Link from '@/components/ui/Link';
import { useRouter } from '@/lib/client/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PostedTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { pinPath } from '@/lib/seo';
import type { PinJson, PinUserJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';

// A pair the signed-in viewer may decide, as GET /api/pins/:id/duplicates lists it.
type Pair = {
  status: 'suggested' | 'confirmed' | 'rejected';
  reason: 'similar' | 'sourceUrl';
  score: number | null;
  // Claude's read on the pair from both pins and their references; null until checked.
  verdict: 'same' | 'different' | 'unsure' | null;
  verdictReasoning: string | null;
  pin: { id: number; title: string; user?: PinUserJson; utcStartDateTime: string; utcCreatedDateTime: string };
};


// The pin's confirmed duplicates (the same event pinned by others), for
// everyone; for an admin or the author of either pin, also the app's
// suggestions to confirm or dismiss, and a way to unlink a confirmed one.
// group: the whole confirmed group, this pin included, best ranked first.
export function PinDuplicates({ pinId, group, timeZone }: { pinId: number; group: PinJson[]; timeZone: string }) {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const load = useCallback(() => {
    api
      .get<Pair[]>(`/api/pins/${pinId}/duplicates`)
      .then(setPairs)
      .catch(() => setPairs([]));
  }, [pinId]);
  useEffect(() => {
    if (isLoggedIn) load();
  }, [isLoggedIn, load]);

  async function decide(otherId: number, status: 'confirmed' | 'rejected') {
    setBusy(otherId);
    setError(null);
    try {
      await api.put(`/api/pins/${pinId}/duplicates/${otherId}`, { status });
      load();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('duplicates.saveFailed'));
    } finally {
      setBusy(null);
    }
  }

  const others = group.filter((p) => p.id !== pinId);
  const decidable = new Map(pairs.map((pair) => [pair.pin.id, pair]));
  const suggested = pairs.filter((pair) => pair.status === 'suggested');
  const dismissed = pairs.filter((pair) => pair.status === 'rejected');
  if (!others.length && !suggested.length && !dismissed.length) {
    return null;
  }
  const onTimeline = group[0]?.id;

  // Pairs already dismissed, folded away under the suggestions (or on their own).
  const dismissedList = (className = '') => (
    <details className={className}>
      <summary className="cursor-pointer text-sm text-subtle hover:text-ink">{t('duplicates.dismissedCount', { count: dismissed.length })}</summary>
      <ul className={`mt-3 ${SCROLL_LIST}`}>
        {dismissed.map((pair) => (
          <SuggestionRow key={pair.pin.id} pair={pair} timeZone={timeZone} busy={busy === pair.pin.id}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy === pair.pin.id} onClick={() => decide(pair.pin.id, 'confirmed')}>
              {t('duplicates.sameAfterAll')}
            </button>
          </SuggestionRow>
        ))}
      </ul>
    </details>
  );
  const SuggestHeading = others.length ? 'h3' : 'h2';

  return (
    <section
      id="duplicates"
      aria-labelledby={others.length || suggested.length ? 'duplicates-heading' : undefined}
      aria-label={others.length || suggested.length ? undefined : t('duplicates.dismissed')}
      // Only authors and admins get suggestions, so with nothing public to
      // show the whole panel is theirs and takes the privileged colour.
      className={`${others.length ? 'surface' : 'surface-privileged'} mt-6 p-5`}
    >
      {others.length ? (
        <>
          <h2 id="duplicates-heading" className="text-base font-semibold">
            {t('duplicates.alsoPinned')}
          </h2>
          <p className="mt-1 text-sm text-subtle">
            {t('duplicates.sameEventPinned', { count: others.length })}{' '}
            {onTimeline === pinId ? t('duplicates.stackThisOne') : t('duplicates.stack')}
          </p>
          <ul className="mt-3 space-y-1">
            {others.map((p) => (
              <li key={p.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-raised/60">
                <div className="min-w-0 flex-1">
                  <Link href={pinPath(p)} className="text-sm font-medium text-ink hover:text-link hover:no-underline">
                    {p.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
                    <PinAuthor user={p.user} />
                    {p.utcCreatedDateTime ? <PostedTime value={p.utcCreatedDateTime} serverTimeZone={timeZone} /> : null}
                    <span className="tabular-nums">
                      {t('watch.count', { count: p.favoriteCount ?? 0 })} · {t('pin.views', { count: p.viewCount ?? 0 })}
                    </span>
                    {p.id === onTimeline ? <span className="rounded-full bg-raised px-2 py-px text-muted ring-1 ring-line ring-inset">{t('duplicates.onTimeline')}</span> : null}
                  </div>
                </div>
                {decidable.get(p.id)?.status === 'confirmed' ? (
                  <button type="button" className="btn btn-ghost btn-sm shrink-0" disabled={busy === p.id} onClick={() => decide(p.id, 'rejected')}>
                    {t('duplicates.unlink')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {suggested.length || dismissed.length ? (
        // Beside the public list above, the private part gets a box of its own.
        <div className={others.length ? 'surface-privileged mt-5 p-4' : ''}>
          {suggested.length ? (
            // Collapsed until asked for: it is housekeeping, not the pin.
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                <Icon name="shield" className="size-4 shrink-0 text-privileged" />
                <SuggestHeading id={others.length ? undefined : 'duplicates-heading'} className="text-base font-semibold">
                  {t('duplicates.possible')}
                </SuggestHeading>
                <span className="ml-auto rounded-full bg-raised px-2 py-px text-xs font-medium text-muted tabular-nums ring-1 ring-line ring-inset">
                  {suggested.length}
                  <span className="sr-only"> {t('duplicates.suggestions', { count: suggested.length })}</span>
                </span>
                <Icon name="chevron" className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-1 text-sm text-subtle">{t('duplicates.privateNote')}</p>
              <ul className={`mt-3 ${SCROLL_LIST}`}>
                {suggested.map((pair) => (
                  <SuggestionRow key={pair.pin.id} pair={pair} timeZone={timeZone} busy={busy === pair.pin.id}>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy === pair.pin.id} onClick={() => decide(pair.pin.id, 'confirmed')}>
                      {t('duplicates.same')}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy === pair.pin.id} onClick={() => decide(pair.pin.id, 'rejected')}>
                      {t('duplicates.notSame')}
                    </button>
                  </SuggestionRow>
                ))}
              </ul>
              {dismissed.length ? dismissedList('mt-4') : null}
            </details>
          ) : (
            dismissedList()
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

// A long list of suggestions scrolls inside the panel rather than pushing the
// rest of the page down. The padding keeps the rows' rings from being clipped.
const SCROLL_LIST = 'max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain p-px pr-1';

function PinAuthor({ user }: { user?: PinUserJson }) {
  if (!user?.userName) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-4 text-[8px]" />
      {user.userName}
    </span>
  );
}

const VERDICTS = {
  same: { label: 'duplicates.aiSame', className: 'bg-success/15 text-success-soft ring-success/30' },
  different: { label: 'duplicates.aiDifferent', className: 'bg-danger/15 text-danger-soft ring-danger/30' },
  unsure: { label: 'duplicates.aiUnsure', className: 'bg-warning/15 text-warning-soft ring-warning/30' },
} as const;

function SuggestionRow({ pair, timeZone, busy, children }: { pair: Pair; timeZone: string; busy: boolean; children: React.ReactNode }) {
  const t = useT();
  const why = pair.reason === 'sourceUrl' ? t('duplicates.sameSource') : t('duplicates.titleSimilar', { percent: Math.round((pair.score ?? 0) * 100) });
  return (
    <li className="rounded-lg bg-raised/60 px-3 py-2.5 ring-1 ring-line ring-inset" aria-busy={busy}>
      <Link href={pinPath(pair.pin)} className="text-sm font-medium text-ink hover:text-link hover:no-underline">
        {pair.pin.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
        <PinAuthor user={pair.pin.user} />
        <PostedTime value={pair.pin.utcCreatedDateTime} serverTimeZone={timeZone} />
        <span>{why}</span>
        {pair.verdict ? (
          <span className={`rounded-full px-2 py-px font-medium ring-1 ring-inset ${VERDICTS[pair.verdict].className}`}>{t(VERDICTS[pair.verdict].label)}</span>
        ) : null}
      </div>
      {pair.verdict && pair.verdictReasoning ? <p className="mt-1.5 text-xs text-muted">{pair.verdictReasoning}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </li>
  );
}
