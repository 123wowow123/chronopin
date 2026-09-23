'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthLink } from '@/components/nav/AuthLink';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { onLive } from '@/lib/client/liveFeed';
import { useRouter } from '@/lib/client/navigation';
import { usePendingAction } from '@/lib/client/pendingAction';
import { useSession } from '@/lib/client/session';
import { AI_FEEDBACK_MAX } from '@/lib/duplicateDraft';
import type { SuggestionJson } from '@/lib/types';

const VERDICT_CLASS = {
  supported: 'bg-success/10 text-success ring-success/25',
  partly: 'bg-raised text-ink ring-line',
  unsupported: 'bg-danger/10 text-danger ring-danger/25',
  unclear: 'bg-raised text-muted ring-line',
} as const;

// A free-text box for telling the AI what a pin is missing or getting wrong: a
// link, a different date, a fact. The AI checks it against the pin's own
// sources (which stay the truth) and adds any page that backs it up as a
// reference, which moves the pin's dates and summary as references do. Under
// the box, the viewer's own suggestions on this pin and what came of them.
export function PinSuggest({ pinId }: { pinId: number }) {
  const t = useT();
  const router = useRouter();
  const { isLoggedIn, status } = useSession();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mine, setMine] = useState<SuggestionJson[]>([]);
  // Ids of the viewer's suggestions still under review.
  const pending = useRef(new Set<number>());

  const load = useCallback(() => {
    api
      .get<SuggestionJson[]>(`/api/pins/${pinId}/ai-feedback`)
      .then((rows) => {
        // A review that added references changed the pin: show them.
        if (rows.some((r) => r.status === 'applied' && pending.current.has(r.id))) {
          router.refresh();
        }
        pending.current = new Set(rows.filter((r) => r.status === 'open').map((r) => r.id));
        setMine(rows);
      })
      .catch(() => {});
  }, [pinId, router]);

  // Read once signed in, then again when a review can have finished: the pin
  // changing on the live feed (a review that added references), or the reader
  // coming back to the tab (one that did not). Never on a timer.
  useEffect(() => {
    if (!isLoggedIn) return;
    load();
    const stop = onLive<{ id?: number }>('pin:update', (pin) => {
      if (Number(pin?.id) === pinId && pending.current.size) load();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.current.size) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoggedIn, pinId, load]);

  // The suggestion the reader came back from logging in to write.
  const sectionRef = usePendingAction<HTMLElement>(
    { kind: 'suggest', id: pinId },
    isLoggedIn,
    useCallback(() => setOpen(true), []),
  );

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const feedback = text.trim();
    if (!feedback || sending) return;
    setSending(true);
    setError('');
    try {
      const created = await api.post<SuggestionJson>(`/api/pins/${pinId}/ai-feedback`, { feedback });
      setMine((list) => [{ ...created, feedback, status: 'open' }, ...list]);
      pending.current.add(created.id);
      setText('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t('suggest.tooMany') : t('suggest.failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <section ref={sectionRef} aria-labelledby="suggest-heading" className="surface mt-6 px-4 py-3">
      <h2 id="suggest-heading" className="flex items-center gap-2 text-base font-semibold">
        <Icon name="sparkle" className="size-4 text-link" />
        {t('suggest.heading')}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-subtle">{t('suggest.explainer')}</p>

      {!isLoggedIn ? (
        status === 'ready' ? (
          <p className="mt-2 pb-1 text-sm text-subtle">
            {t.rich('suggest.logIn', {
              login: (chunks) => (
                <AuthLink to="/login" className="font-medium" pending={{ kind: 'suggest', id: pinId }}>
                  {chunks}
                </AuthLink>
              ),
            })}
          </p>
        ) : null
      ) : open ? (
        <form className="mt-3" onSubmit={send}>
          <label htmlFor={`suggest-${pinId}`} className="field-label">
            {t('suggest.label')}
          </label>
          <textarea
            id={`suggest-${pinId}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('suggest.placeholder')}
            maxLength={AI_FEEDBACK_MAX}
            className="field"
            rows={4}
            autoFocus
          />
          {error ? <div className="mt-1 text-sm text-danger">{error}</div> : null}
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
              {t('suggest.send')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {t('suggest.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm mt-3 mb-1" onClick={() => setOpen(true)}>
          <Icon name="pencil" className="size-3.5" />
          {t('suggest.open')}
        </button>
      )}

      {mine.length ? (
        <div className="mt-3 border-t border-line pt-3">
          <h3 className="text-sm font-medium text-muted">{t('suggest.yours')}</h3>
          <ul className="mt-2 space-y-3">
            {mine.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="whitespace-pre-line text-ink">{s.feedback}</p>
                <SuggestionOutcome suggestion={s} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function SuggestionOutcome({ suggestion: s }: { suggestion: SuggestionJson }) {
  const t = useT();
  if (s.status === 'open') {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
        <span className="size-1.5 animate-pulse rounded-full bg-link" aria-hidden />
        <span className="font-medium text-muted">{t('suggest.checking')}</span>· {t('suggest.checkingHint')}
      </p>
    );
  }
  const added = s.aiReferences ?? [];
  return (
    <div className="mt-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {s.aiVerdict ? (
          <span className={`rounded-full px-2 py-px font-medium ring-1 ring-inset ${VERDICT_CLASS[s.aiVerdict]}`}>{t(`suggest.verdict.${s.aiVerdict}`)}</span>
        ) : null}
        <span className="text-subtle">{s.status === 'applied' ? t('suggest.applied', { count: added.length }) : t('suggest.dismissed')}</span>
      </div>
      {s.aiReasoning ? <p className="mt-1 leading-relaxed text-muted">{s.aiReasoning}</p> : null}
      {added.length ? (
        <ul className="mt-1 space-y-0.5">
          {added.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener nofollow" className="inline-flex max-w-full items-center gap-1">
                <span className="truncate">{r.title || r.url}</span>
                <span className="shrink-0 text-subtle tabular-nums">{r.confidence}%</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
