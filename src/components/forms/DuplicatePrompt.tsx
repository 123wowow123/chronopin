'use client';

import Link from '@/components/ui/Link';
import { useRouter } from '@/lib/client/navigation';
import { useEffect, useRef, useState } from 'react';
import { StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError } from '@/lib/client/api';
import { AI_FEEDBACK_MAX, draftAsReferences } from '@/lib/duplicateDraft';
import type { PinFormValues } from '@/lib/pinForm';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';
import { useLocalize } from '@/lib/client/navigation';

// An existing pin the draft would duplicate, as GET /api/pins/duplicates lists it.
export type DuplicateMatch = { reason: 'similar' | 'sourceUrl'; score: number | null; pin: PinJson };

// Shown when the pin being posted looks already pinned. For each existing pin
// the author can add their link to it as a reference, post theirs as a
// response to it, or tell the AI what it is missing; or post theirs anyway.
export function DuplicatePrompt({
  matches,
  draft,
  onRespond,
  onPostAnyway,
}: {
  matches: DuplicateMatch[];
  draft: PinFormValues;
  onRespond: (pin: PinJson) => void;
  onPostAnyway: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const t = useT();
  useEffect(() => {
    heading.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    heading.current?.focus({ preventScroll: true });
  }, [matches]);

  const one = matches.length === 1;
  return (
    <section aria-labelledby="duplicate-prompt-heading" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 id="duplicate-prompt-heading" ref={heading} tabIndex={-1} className="text-base font-semibold text-ink outline-none">
        {one ? t('duplicatePrompt.headingOne') : t('duplicatePrompt.headingMany')}
      </h2>
      <p className="mt-1 text-sm text-muted">{one ? t('duplicatePrompt.introOne') : t('duplicatePrompt.introMany')}</p>
      <ul className="mt-3 space-y-2">
        {matches.map((match) => (
          <MatchRow key={match.pin.id} match={match} draft={draft} onRespond={onRespond} />
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPostAnyway}>
          {one ? t('duplicatePrompt.postAnywayOne') : t('duplicatePrompt.postAnywayMany')}
        </button>
      </div>
    </section>
  );
}

function MatchRow({ match, draft, onRespond }: { match: DuplicateMatch; draft: PinFormValues; onRespond: (pin: PinJson) => void }) {
  const router = useRouter();
  const t = useT();
  const localize = useLocalize();
  const { pin } = match;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [writing, setWriting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const references = draftAsReferences(draft);
  const why = match.reason === 'sourceUrl' ? t('duplicates.sameSource') : t('duplicates.titleSimilar', { percent: Math.round((match.score ?? 0) * 100) });

  async function addReferences() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const { added } = await api.post<{ added: number }>(`/api/pins/${pin.id}/references`, { references });
      if (added) {
        router.push(`${pinPath(pin)}#references-heading`);
        return;
      }
      setNote(t('duplicatePrompt.alreadyHas'));
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 500 ? err.message : t('duplicatePrompt.addFailed'));
    }
    setBusy(false);
  }

  async function sendFeedback() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/pins/${pin.id}/ai-feedback`, { feedback, sourceUrl: draft.sourceUrl.trim() || undefined });
      setFeedbackSent(true);
      setWriting(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 500 ? err.message : t('duplicates.saveFailed'));
    }
    setBusy(false);
  }

  return (
    <li className="surface px-3 py-2.5" aria-busy={busy}>
      {/* A new tab, so the draft is not lost. */}
      <a href={localize(pinPath(pin))} target="_blank" rel="noopener" className="text-sm font-medium text-ink hover:text-link hover:no-underline">
        {pin.title}
      </a>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
        {pin.user?.userName ? (
          <span className="inline-flex items-center gap-1">
            <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-4 text-[8px]" />
            {pin.user.userName}
          </span>
        ) : null}
        <StartTime pin={pin} serverTimeZone="UTC" />
        <span>{why}</span>
        <span className="tabular-nums">
          {t('watch.count', { count: pin.favoriteCount ?? 0 })} · {t('duplicatePrompt.references', { count: pin.references?.length ?? 0 })}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || !references.length}
          title={references.length ? undefined : t('duplicatePrompt.sourceFirst')}
          onClick={addReferences}
        >
          {references.length > 1 ? t('duplicatePrompt.addLinkMore', { count: references.length - 1 }) : t('duplicatePrompt.addLink')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onRespond(pin)}>
          {t('duplicatePrompt.respondInstead')}
        </button>
        {feedbackSent ? null : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} aria-expanded={writing} onClick={() => setWriting(!writing)}>
            {t('duplicatePrompt.tellAi')}
          </button>
        )}
      </div>

      {writing ? (
        <div className="mt-2">
          <label htmlFor={`ai-feedback-${pin.id}`} className="field-label">
            {t('duplicatePrompt.missingLabel')}
          </label>
          <textarea
            id={`ai-feedback-${pin.id}`}
            rows={3}
            maxLength={AI_FEEDBACK_MAX}
            className="field"
            placeholder={t('duplicatePrompt.missingPlaceholder')}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriting(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !feedback.trim()} onClick={sendFeedback}>
              {t('duplicatePrompt.sendToAi')}
            </button>
          </div>
        </div>
      ) : null}

      {feedbackSent ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {t('duplicatePrompt.thanks')} <Link href={pinPath(pin)}>{t('duplicatePrompt.viewPin')}</Link>
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {note} <Link href={pinPath(pin)}>{t('duplicatePrompt.viewPin')}</Link>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}
