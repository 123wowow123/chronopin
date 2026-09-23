'use client';

import Link from '@/components/ui/Link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { useNow } from '@/lib/client/now';
import { applyScrape, EMPTY_FORM, formDates, formToPin, type PinFormValues, type ScrapedPin } from '@/lib/pinForm';
import { quickStep } from '@/lib/quickPin';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { DuplicatePrompt, type DuplicateMatch } from './DuplicatePrompt';
import { PinForm, type PinDraft } from './PinForm';

// Must match NOTE_MAX in src/server/extract/index.ts.
const NOTE_MAX = 2000;

type Scraped = ScrapedPin & { llm?: 'session' };
type Phase = 'input' | 'reading' | 'matches' | 'posting';

// Why the full form opened instead of the pin being posted.
const NOTICES = { entries: 'quickPin.entries', unavailable: 'quickPin.aiUnavailable', incomplete: 'quickPin.aiIncomplete' } as const;

// Creating a pin, or a response to one, from a link and a few words: the AI
// reads the page (what the note says steers which event, and what matters),
// finds references and pictures, and the pin is posted as the full form would
// post it - through POST /api/pins, duplicate check first. Whatever the AI
// could not settle on its own opens the full form, filled in, to finish by
// hand: no title or date, no AI at all (no credit), a page of dated entries to
// pick from, or a save that failed.
export function QuickPinForm({ respondTo }: { respondTo?: PinJson }) {
  const t = useT();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState('');
  const [duplicateOf, setDuplicateOf] = useState<Pick<PinJson, 'id' | 'title'> | null>(null);
  const [draft, setDraft] = useState<PinDraft | null>(null);
  const [values, setValues] = useState<PinFormValues | null>(null);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [readingSince, setReadingSince] = useState(0);

  const blank = (): PinFormValues => ({ ...EMPTY_FORM, sourceUrl: url.trim(), parentId: respondTo?.id });

  // The full form, filled in with what was read, and why it is needed. With no
  // description from the AI, the author's own words about the pin start it.
  function finishByHand(next: PinDraft) {
    const words = note.trim();
    if (words && !next.values.description.trim()) {
      next = { ...next, values: { ...next.values, description: noteAsHtml(words) } };
    }
    setDraft(next);
    window.scrollTo({ top: 0 });
  }

  async function findMatches(next: PinFormValues): Promise<DuplicateMatch[]> {
    const start = formDates(next).dates.utcStartDateTime;
    if (!start) return [];
    const params = new URLSearchParams({ title: next.title.trim(), sourceUrl: next.sourceUrl.trim(), start });
    if (next.parentId) params.set('exclude', String(next.parentId));
    return api.get<DuplicateMatch[]>(`/api/pins/duplicates?${params}`).catch(() => []);
  }

  async function post(next: PinFormValues, thread?: Pick<PinJson, 'id' | 'title'>) {
    setPhase('posting');
    setError('');
    setDuplicateOf(null);
    try {
      const saved = await api.post<PinJson>('/api/pins', formToPin(next));
      router.push(pinPath(saved));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The link is already pinned: say where, and let them start again.
        setError(err.message);
        setDuplicateOf((err.body as { pin?: Pick<PinJson, 'id' | 'title'> } | null)?.pin ?? null);
        setPhase('input');
      } else if (isEmailUnverified(err)) {
        setError(t('verifyEmail.required'));
        setPhase('input');
      } else {
        finishByHand({ values: next, respondTo: thread, notice: t('quickPin.saveFailed') });
      }
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setDuplicateOf(null);
    const link = url.trim();
    if (!/^https?:\/\//i.test(link)) return setError(t('quickPin.linkRequired'));

    setPhase('reading');
    setReadingSince(Date.now());
    let scraped: Scraped;
    try {
      scraped = await api.post<Scraped>('/api/scrape', { url: link, note: note.trim() || undefined });
    } catch (err) {
      // The form by hand would be refused too.
      if (isEmailUnverified(err)) {
        setError(t('verifyEmail.required'));
        return setPhase('input');
      }
      const reason = err instanceof ApiError ? t('form.scrapeFailedStatus', { status: err.status }) : t('form.scrapeFailed');
      return finishByHand({ values: blank(), notice: `${reason} ${t('quickPin.byHand')}` });
    }

    let next = applyScrape(blank(), scraped);
    // A later season, or a newer model version, answers the earlier one's pin
    // unless this is already a response to a pin of the author's choosing.
    const thread = respondTo ? undefined : scraped.respondTo;
    if (thread) next = { ...next, parentId: thread.id };

    const step = quickStep(scraped, next);
    if (step !== 'post') {
      return finishByHand({ values: next, entries: step === 'entries' ? scraped.entries : undefined, respondTo: thread, notice: t(NOTICES[step]) });
    }

    const found = await findMatches(next);
    if (found.length) {
      setValues(next);
      setMatches(found);
      setPhase('matches');
      return;
    }
    await post(next, thread);
  }

  if (draft) {
    return <PinForm mode={respondTo ? 'respond' : 'create'} respondTo={respondTo} draft={draft} />;
  }

  const busy = phase === 'reading' || phase === 'posting';
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{respondTo ? t('form.respondPin') : t('form.createPin')}</h1>
      {respondTo ? (
        <p className="mt-2 text-sm text-muted">
          {t('form.respondingTo')} <Link href={pinPath(respondTo)}>{respondTo.title}</Link>
        </p>
      ) : null}
      <p className="mt-2 text-sm text-subtle">{t('quickPin.lede')}</p>

      <form onSubmit={create} noValidate className="surface mt-6 space-y-4 p-5">
        <fieldset disabled={busy || phase === 'matches'} className="space-y-4">
          <div>
            <label htmlFor="quick-url" className="field-label">
              {t('quickPin.link')}
            </label>
            <input
              id="quick-url"
              type="url"
              required
              autoFocus
              placeholder="https://www.example.com/news/…"
              className="field"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="quick-note" className="field-label">
              {t('quickPin.note')} <span className="font-normal text-subtle">({t('form.optional')})</span>
            </label>
            <textarea
              id="quick-note"
              rows={4}
              maxLength={NOTE_MAX}
              placeholder={respondTo ? t('quickPin.notePlaceholderRespond') : t('quickPin.notePlaceholder')}
              className="field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-describedby="quick-note-hint"
            />
            <p id="quick-note-hint" className="mt-1 text-xs text-subtle">
              {t('quickPin.noteHint')}
            </p>
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-danger-soft ring-1 ring-red-500/20 ring-inset">
            {error}
            {duplicateOf ? (
              <>
                {' '}
                <Link href={pinPath(duplicateOf)} className="underline">
                  {t('form.viewPin', { title: duplicateOf.title || t('form.thatPin') })}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        {phase === 'reading' || phase === 'posting' ? (
          <div role="status" className="flex items-start gap-3 rounded-lg bg-link/10 px-3 py-2.5 text-sm text-muted ring-1 ring-link/20 ring-inset">
            <Icon name="sparkle" className="mt-0.5 size-4 shrink-0 animate-pulse text-link" />
            <span>
              {phase === 'reading' ? t('quickPin.reading') : t('quickPin.posting')}
              {phase === 'reading' ? <Elapsed since={readingSince} /> : null}
            </span>
          </div>
        ) : null}

        {phase === 'matches' && values ? (
          <DuplicatePrompt
            matches={matches}
            draft={values}
            onRespond={(parent) => post({ ...values, parentId: parent.id }, parent)}
            onPostAnyway={() => post(values)}
          />
        ) : null}

        <div className="flex justify-end">
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()} className="btn btn-secondary">
              {t('common.cancel')}
            </button>
            {phase === 'matches' ? null : (
              <button type="submit" className="btn btn-primary px-6" disabled={busy}>
                {respondTo ? t('quickPin.respond') : t('quickPin.create')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// How long the page has been being read: it takes up to two minutes, and a
// counter says it is still going.
function Elapsed({ since }: { since: number }) {
  const t = useT();
  const now = useNow(1000);
  const seconds = now && since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  return <span className="ml-1 text-subtle tabular-nums">{t('quickPin.elapsed', { seconds })}</span>;
}

// The note as the rich-text editor's HTML: escaped, a paragraph per blank-line
// break, line breaks kept.
function noteAsHtml(text: string) {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escape(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
