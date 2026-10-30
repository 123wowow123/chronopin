'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import { MAX_LABEL_LENGTH, type SearchAlertRow } from '@/lib/searchAlerts';

// "Save search" in the search box's left corner, in place of the magnifier: keeps the query and tells the reader (in
// the bell, and in the Monday email) when a new pin matches it. A popover
// names the search and picks where the alerts go; a saved search reopens it
// with a way to delete. Signed-out readers see nothing.
export function SearchAlertButton({ query, fallback = null }: { query: string; fallback?: React.ReactNode }) {
  const t = useT();
  const { isLoggedIn } = useSession();
  const [saved, setSaved] = useState<SearchAlertRow | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [bell, setBell] = useState(true);
  const [digest, setDigest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const trimmed = query.trim();

  useEffect(() => {
    if (!isLoggedIn || !trimmed) return;
    let live = true;
    api
      .get<{ searches: SearchAlertRow[] }>(`/api/search-alerts?q=${encodeURIComponent(trimmed)}`)
      .then((answer) => {
        if (!live) return;
        setSaved(answer.searches[0] ?? null);
        setReady(true);
      })
      .catch(() => live && setReady(false));
    return () => {
      live = false;
    };
  }, [isLoggedIn, trimmed]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Nothing to save (signed out, no query, not read yet): the box keeps its magnifier.
  if (!isLoggedIn || !ready || !trimmed) return <>{fallback}</>;

  function toggle() {
    if (!open) {
      setLabel(saved?.label ?? '');
      setBell(saved?.notifyBell ?? true);
      setDigest(saved?.notifyDigest ?? true);
      setError('');
    }
    setOpen((o) => !o);
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      setSaved(await api.post<SearchAlertRow>('/api/search-alerts', { query: trimmed, label: label.trim() || null, notifyBell: bell, notifyDigest: digest }));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error && err.message && err.message !== 'Bad Request' ? err.message : t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!saved) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/api/search-alerts/${saved.id}`);
      setSaved(null);
      setOpen(false);
    } catch {
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    // The box around it starts a drag or focuses the field on a press: this is a button, not part of the field.
    <div ref={box} className="relative flex shrink-0" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={saved ? t('searchAlerts.saved') : t('searchAlerts.save')}
        title={saved ? t('searchAlerts.saved') : t('searchAlerts.save')}
        onClick={toggle}
        className="group/star ms-2 flex size-7 items-center justify-center rounded-full hover:bg-raised"
      >
        {/* Not saved: an outline that fills gold under the pointer (what a click does). Saved: solid gold that hollows under it (it opens the popover to delete). */}
        <Icon
          name="star"
          className={`size-4 transition-colors motion-reduce:transition-none ${
            saved ? 'fill-current text-curated group-hover/star:fill-transparent' : 'text-subtle group-hover/star:fill-current group-hover/star:text-curated'
          }`}
        />
      </button>
      {open ? (
        <div role="dialog" aria-label={t('searchAlerts.title')} className="surface absolute start-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 p-4 shadow-xl">
          <p className="font-semibold text-ink">{t('searchAlerts.title')}</p>
          <div>
            <label htmlFor={nameId} className="field-label mb-1 block text-xs uppercase">
              {t('searchAlerts.name')}
            </label>
            <input id={nameId} value={label} maxLength={MAX_LABEL_LENGTH} placeholder={trimmed} onChange={(e) => setLabel(e.target.value)} className="field w-full" />
          </div>
          <fieldset className="space-y-2">
            <legend className="field-label mb-1 text-xs uppercase">{t('searchAlerts.alertMe')}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bell} onChange={(e) => setBell(e.target.checked)} className="size-4 accent-accent" />
              {t('searchAlerts.inBell')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} className="size-4 accent-accent" />
              {t('searchAlerts.inDigest')}
            </label>
          </fieldset>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            {saved ? (
              <button type="button" disabled={busy} onClick={() => void remove()} className="text-sm text-subtle hover:text-danger-soft">
                {t('common.delete')}
              </button>
            ) : (
              <span />
            )}
            <span className="flex gap-2">
              <button type="button" className="btn btn-secondary rounded-full px-4 py-1.5" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" disabled={busy} className="btn btn-primary rounded-full px-4 py-1.5" onClick={() => void save()}>
                {t('searchAlerts.saveAction')}
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
