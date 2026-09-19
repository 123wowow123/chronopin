'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client/api';
import { type ConfidenceRow, confidenceStats, isHidden } from '@/lib/confidenceStats';
import { minConfidence, type TimelineConfidenceSetting } from '@/lib/timelineConfidence';
import { PinTimeCharts } from './PinTimeCharts';
import { VisibilityCharts } from './VisibilityCharts';

export type DashboardRow = ConfidenceRow & { created: string };

// The timeline's confidence filter, with the charts below it previewing the
// draft before it is saved.
export function PinsDashboard({ rows, saved, serverNow }: { rows: DashboardRow[]; saved: TimelineConfidenceSetting; serverNow: string }) {
  const [current, setCurrent] = useState(saved);
  const [draft, setDraft] = useState(saved);
  // What is typed in the number box, which may be briefly out of range or empty.
  const [typed, setTyped] = useState(String(saved.threshold));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const threshold = minConfidence(draft);
  const stats = useMemo(() => confidenceStats(rows, threshold), [rows, threshold]);
  const created = useMemo(() => rows.map((r) => ({ created: r.created, hidden: isHidden(r.confidence, threshold) })), [rows, threshold]);
  const dirty = draft.enabled !== current.enabled || draft.threshold !== current.threshold;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<TimelineConfidenceSetting>('/api/admin/timeline-confidence', draft);
      setCurrent(next);
      setDraft(next);
      setTyped(String(next.threshold));
      setMessage(next.enabled ? `Saved. The timeline now hides pins scored below ${next.threshold}.` : 'Saved. The timeline now shows every pin.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Amber, like other status warnings: saving changes what every visitor's timeline hides. */}
      <form onSubmit={save} className="mb-6 space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-warning-soft">
            <Icon name="warning" className="size-4 text-warning" />
            Timeline confidence filter
          </h2>
          <p className="text-sm text-subtle">
            Pins with no score always show. Watched lists, search and the map show every pin either way. The charts below preview
            your changes before you save.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="size-4 accent-amber-500"
          />
          Hide low-confidence pins from the home timeline
        </label>

        <div className={draft.enabled ? '' : 'opacity-50'}>
          <label htmlFor="confidence-threshold" className="field-label">
            Minimum confidence
          </label>
          <div className="flex items-center gap-3">
            <input
              id="confidence-threshold"
              type="range"
              min={0}
              max={100}
              step={1}
              value={draft.threshold}
              disabled={!draft.enabled}
              onChange={(e) => {
                setDraft((d) => ({ ...d, threshold: Number(e.target.value) }));
                setTyped(e.target.value);
              }}
              className="min-w-0 flex-1 accent-amber-500"
            />
            <input
              type="number"
              aria-label="Minimum confidence percentage"
              min={0}
              max={100}
              step={1}
              value={typed}
              disabled={!draft.enabled}
              onChange={(e) => {
                setTyped(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== '' && Number.isInteger(n) && n >= 0 && n <= 100) {
                  setDraft((d) => ({ ...d, threshold: n }));
                }
              }}
              onBlur={() => setTyped(String(draft.threshold))}
              className="field w-20 tabular-nums"
            />
            <span className="text-sm text-subtle">%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          {dirty ? (
            <button type="button" className="btn btn-ghost" onClick={() => {
                setDraft(current);
                setTyped(String(current.threshold));
              }} disabled={busy}>
              Reset
            </button>
          ) : null}
          {dirty ? (
            <span className="text-sm text-subtle">
              Previewing: {stats.hidden} of {stats.total} pins would be hidden.
            </span>
          ) : null}
        </div>
        {message ? (
          <p role="status" className="text-sm text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>

      <PinTimeCharts pins={created} serverNow={serverNow} />
      <VisibilityCharts stats={stats} />
    </>
  );
}
