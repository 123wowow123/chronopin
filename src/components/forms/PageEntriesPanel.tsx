'use client';

import Link from '@/components/ui/Link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { modelRelease } from '@/lib/modelSeries';
import { creationOrder, entryToPin, type EntryShared, type PageEntry } from '@/lib/pageEntries';
import { pinPath } from '@/lib/seo';
import type { MediumJson, PinJson } from '@/lib/types';

type FoundImages = {
  images: { originalUrl: string; width: number; height: number }[];
  references: { url: string; title: string; confidence: number; publishedDate?: string; reasoning: string }[];
};

// The entry's pin with the pictures (and announcement) a scrape would top it
// up with; as it was when the lookup fails.
async function withFoundImages(body: ReturnType<typeof entryToPin>): Promise<ReturnType<typeof entryToPin>> {
  const params = new URLSearchParams({ title: body.title, start: body.utcStartDateTime, have: String(body.media.length) });
  if (body.company) params.set('company', body.company);
  if (body.companyWikiUrl) params.set('companyWikiUrl', body.companyWikiUrl);
  body.media.forEach((m) => m.originalUrl && params.append('skip', m.originalUrl));
  const found = await api.get<FoundImages>(`/api/scrape/images?${params}`).catch(() => null);
  if (!found) return body;
  const media: MediumJson[] = found.images.map((img) => ({ type: 1, originalUrl: img.originalUrl, originalWidth: img.width || undefined, originalHeight: img.height || undefined }));
  return { ...body, media: [...body.media, ...media], references: [...body.references, ...found.references] };
}

type Row = { entry: PageEntry; selected: boolean; title: string; day: string };
type Outcome = { url: string; title: string; pin?: Pick<PinJson, 'id' | 'title' | 'parentId'>; status: 'created' | 'pinned' | 'failed' };

// A release-notes or changelog page read as its dated entries: the author
// picks which to pin, fixes their titles and dates, and gets one pin each,
// posted oldest first so each can follow the one before it
// (src/lib/pageEntries.ts). Every pin is filed like the form's own draft.
export function PageEntriesPanel({ pageTitle, entries, shared }: { pageTitle: string; entries: PageEntry[]; shared: () => EntryShared }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    entries.map((entry) => ({ entry, selected: !entry.existing && !!entry.startDate, title: entry.title, day: entry.startDate ?? '' })),
  );
  // Model releases thread by model line; anything else, one product's
  // changelog, reads best as one series.
  const [chain, setChain] = useState(() => !entries.some((e) => modelRelease(e.title)));
  const [progress, setProgress] = useState<{ done: number; count: number } | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const pinned = rows.filter((r) => r.entry.existing).length;
  const chosen = rows.filter((r) => r.selected && !r.entry.existing && r.title.trim() && r.day);
  const update = (index: number, change: Partial<Row>) => setRows((all) => all.map((r, i) => (i === index ? { ...r, ...change } : r)));
  const selectNew = (selected: boolean) => setRows((all) => all.map((r) => ({ ...r, selected: selected && !r.entry.existing && !!r.day })));

  async function create() {
    const order = creationOrder(chosen.map((r) => ({ ...r, startDate: r.day })));
    const base = shared();
    const done: Outcome[] = [];
    let previous: number | undefined;
    setOutcomes([]);
    setProgress({ done: 0, count: order.length });
    for (const row of order) {
      const body = await withFoundImages(entryToPin({ ...row.entry, title: row.title, startDate: row.day, pageDay: row.entry.startDate }, base, pageTitle));
      const outcome: Outcome = { url: row.entry.url, title: row.title, status: 'failed' };
      try {
        const pin = await api.post<PinJson>('/api/pins', chain && previous ? { ...body, parentId: previous } : body);
        Object.assign(outcome, { status: 'created', pin });
      } catch (err) {
        const existing = err instanceof ApiError && err.status === 409 ? (err.body as { pin?: Pick<PinJson, 'id' | 'title'> } | null)?.pin : undefined;
        if (existing) Object.assign(outcome, { status: 'pinned', pin: existing });
      }
      if (outcome.pin) {
        previous = outcome.pin.id;
        const existing = { id: outcome.pin.id, title: outcome.pin.title };
        setRows((all) => all.map((r) => (r.entry.url === row.entry.url ? { ...r, selected: false, entry: { ...r.entry, existing } } : r)));
      }
      done.push(outcome);
      setOutcomes([...done]);
      setProgress({ done: done.length, count: order.length });
    }
    setProgress(null);
  }

  const created = outcomes.filter((o) => o.status === 'created').length;

  return (
    <div className="mt-2 rounded-lg px-3 py-2 text-sm ring-1 ring-line ring-inset">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {t('form.entriesFound', { count: entries.length })} {pinned ? t('form.entriesPinned', { count: pinned }) : null}
        </span>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
          {t('form.entriesOpen')}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-subtle">{t('form.entriesShared')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => selectNew(true)}>
              {t('form.entriesSelectNew')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => selectNew(false)}>
              {t('form.entriesSelectNone')}
            </button>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={chain} onChange={(e) => setChain(e.target.checked)} />
              {t('form.entriesChain')}
            </label>
          </div>
          <p className="text-subtle">{chain ? t('form.entriesChainOn') : t('form.entriesChainOff')}</p>

          <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {rows.map((row, index) => (
              <li key={row.entry.url} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input
                  type="checkbox"
                  aria-label={t('form.entrySelect', { heading: row.entry.heading })}
                  checked={row.selected && !row.entry.existing}
                  disabled={!!row.entry.existing}
                  onChange={(e) => update(index, { selected: e.target.checked })}
                />
                <input
                  type="date"
                  aria-label={t('form.entryDate', { heading: row.entry.heading })}
                  className="field w-auto shrink-0"
                  value={row.day}
                  disabled={!!row.entry.existing}
                  onChange={(e) => update(index, { day: e.target.value, selected: !!e.target.value })}
                />
                {row.entry.existing ? (
                  <Link href={pinPath(row.entry.existing)} className="min-w-0 flex-1 truncate">
                    {row.entry.existing.title} <span className="text-subtle">({t('form.entryPinned')})</span>
                  </Link>
                ) : (
                  <input
                    aria-label={t('form.entryTitle', { heading: row.entry.heading })}
                    className="field min-w-0 flex-1"
                    maxLength={180}
                    value={row.title}
                    title={row.entry.heading}
                    onChange={(e) => update(index, { title: e.target.value })}
                  />
                )}
                {!row.entry.existing && !row.day ? <span className="shrink-0 text-warning">{t('form.entryNeedsDate')}</span> : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary btn-sm" disabled={!chosen.length || !!progress} onClick={create}>
              {t('form.entriesCreate', { count: chosen.length })}
            </button>
            {progress ? <span className="text-subtle">{t('form.entriesProgress', { done: progress.done, count: progress.count })}</span> : null}
            {!progress && outcomes.length ? <span>{t('form.entriesCreated', { count: created })}</span> : null}
          </div>

          {outcomes.length ? (
            <ul className="space-y-1">
              {outcomes.map((o) => (
                <li key={o.url}>
                  {o.pin ? <Link href={pinPath(o.pin)}>{o.pin.title}</Link> : o.title}{' '}
                  <span className={o.status === 'failed' ? 'text-danger' : 'text-subtle'}>
                    {o.status === 'created'
                      ? o.pin?.parentId
                        ? t('form.entryThreaded')
                        : t('form.entryStandalone')
                      : o.status === 'pinned'
                        ? t('form.entryPinned')
                        : t('form.entryFailed')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
