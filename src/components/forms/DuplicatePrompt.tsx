'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError } from '@/lib/client/api';
import { AI_FEEDBACK_MAX, draftAsReferences } from '@/lib/duplicateDraft';
import type { PinFormValues } from '@/lib/pinForm';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';

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
  useEffect(() => {
    heading.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    heading.current?.focus({ preventScroll: true });
  }, [matches]);

  const one = matches.length === 1;
  return (
    <section aria-labelledby="duplicate-prompt-heading" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 id="duplicate-prompt-heading" ref={heading} tabIndex={-1} className="text-base font-semibold text-ink outline-none">
        {one ? 'This looks already pinned' : 'This looks already pinned by others'}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Rather than a second pin for the same event, you can add your link to {one ? 'it' : 'one of them'}, respond to {one ? 'it' : 'one'} with your own pin, or tell
        the AI what {one ? 'it is' : "they're"} missing.
      </p>
      <ul className="mt-3 space-y-2">
        {matches.map((match) => (
          <MatchRow key={match.pin.id} match={match} draft={draft} onRespond={onRespond} />
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPostAnyway}>
          {one ? "It's a different event, post my pin" : "None of these, post my pin"}
        </button>
      </div>
    </section>
  );
}

function MatchRow({ match, draft, onRespond }: { match: DuplicateMatch; draft: PinFormValues; onRespond: (pin: PinJson) => void }) {
  const router = useRouter();
  const { pin } = match;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [writing, setWriting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const references = draftAsReferences(draft);
  const why = match.reason === 'sourceUrl' ? 'Same source link' : `Title ${Math.round((match.score ?? 0) * 100)}% similar`;

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
      setNote('That pin already has your link and its references.');
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 500 ? err.message : 'Could not add your link. Please try again.');
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
      setError(err instanceof ApiError && err.status !== 500 ? err.message : 'Could not save that. Please try again.');
    }
    setBusy(false);
  }

  return (
    <li className="surface px-3 py-2.5" aria-busy={busy}>
      {/* A new tab, so the draft is not lost. */}
      <a href={pinPath(pin)} target="_blank" rel="noopener" className="text-sm font-medium text-ink hover:text-link hover:no-underline">
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
          {pin.favoriteCount ?? 0} watching · {pin.references?.length ?? 0} {pin.references?.length === 1 ? 'reference' : 'references'}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || !references.length}
          title={references.length ? undefined : 'Add a source URL first'}
          onClick={addReferences}
        >
          {references.length > 1 ? `Add my link as a reference (+${references.length - 1} found)` : 'Add my link as a reference'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onRespond(pin)}>
          Respond to it instead
        </button>
        {feedbackSent ? null : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} aria-expanded={writing} onClick={() => setWriting(!writing)}>
            Tell the AI what it&apos;s missing
          </button>
        )}
      </div>

      {writing ? (
        <div className="mt-2">
          <label htmlFor={`ai-feedback-${pin.id}`} className="field-label">
            What is this pin missing or getting wrong?
          </label>
          <textarea
            id={`ai-feedback-${pin.id}`}
            rows={3}
            maxLength={AI_FEEDBACK_MAX}
            className="field"
            placeholder="The launch moved to March; my link has the new date and the price."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriting(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !feedback.trim()} onClick={sendFeedback}>
              Send to the AI
            </button>
          </div>
        </div>
      ) : null}

      {feedbackSent ? (
        <p role="status" className="mt-2 text-sm text-muted">
          Thanks, saved for the AI to work into this pin.{' '}
          <Link href={pinPath(pin)}>View the pin</Link>
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {note} <Link href={pinPath(pin)}>View the pin</Link>
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
