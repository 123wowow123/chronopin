'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';

type Mark = { reason: string; utcCreatedDateTime: string } | null;

// Marks a pin for the midnight job to look at again (schema 0067,
// docs/okf/scraping/daily-jobs.md#revisits), or closes its open mark. Admin
// only; the mark is read when the popover opens, not on every page view.
export function PinRevisitButton({ pinId }: { pinId: number }) {
  const { isAdmin } = useSession();
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState<Mark | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    // A page left hidden (React Activity) must not keep its popover.
    return () => {
      document.removeEventListener('mousedown', close);
      setOpen(false);
    };
  }, [open]);

  if (!isAdmin) return null;

  const attempt = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && mark === undefined) void attempt(async () => setMark(await api.get<Mark>(`/api/pins/${pinId}/revisit`)));
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`inline-flex rounded-md p-1.5 hover:bg-raised hover:text-ink ${mark ? 'text-warning' : 'text-subtle'}`}
        title="Mark for revisiting"
      >
        <Icon name="clock" className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-panel p-3 text-sm shadow-lg">
          {mark === undefined ? (
            <p className="text-subtle">{busy ? 'Loading…' : ''}</p>
          ) : mark ? (
            <>
              <p className="font-medium">Marked for revisiting</p>
              <p className="mt-1 whitespace-pre-wrap text-subtle">{mark.reason}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-2"
                disabled={busy}
                onClick={() =>
                  void attempt(async () => {
                    await api.delete(`/api/pins/${pinId}/revisit`, {});
                    setMark(null);
                  })
                }
              >
                Resolve
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void attempt(async () => {
                  setMark(await api.post<Mark>(`/api/pins/${pinId}/revisit`, { reason }));
                  setReason('');
                });
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="font-medium">What should the midnight job look at?</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} required className="field" />
              </label>
              <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={busy || !reason.trim()}>
                Mark for revisiting
              </button>
            </form>
          )}
          {error ? <p className="mt-2 text-danger" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
