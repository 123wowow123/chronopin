'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import { searchAlertName, type SearchAlertRow } from '@/lib/searchAlerts';

// The search box's magnifier, for a signed-in reader a button that opens the
// searches they saved (SearchAlertButton keeps a search; this lists them). A
// search runs on a click; the last row leads to where they are managed.
// Signed out, it is only the icon.
export function SavedSearchesMenu({ icon }: { icon: React.ReactNode }) {
  const t = useT();
  const { isLoggedIn } = useSession();
  const [open, setOpen] = useState(false);
  const [searches, setSearches] = useState<SearchAlertRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!isLoggedIn) return <>{icon}</>;

  // Read each time it opens: a search saved a moment ago is there.
  function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    setFailed(false);
    api
      .get<{ searches: SearchAlertRow[] }>('/api/search-alerts')
      .then((answer) => setSearches(answer.searches))
      .catch(() => setFailed(true));
  }

  return (
    // The box around it starts a drag or focuses the field on a press: this is a button, not part of the field.
    <div ref={box} className="relative flex shrink-0" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('searchAlerts.heading')}
        title={t('searchAlerts.heading')}
        onClick={toggle}
        className="flex h-9 items-center rounded-full"
      >
        {icon}
      </button>
      {open ? (
        <div role="dialog" aria-label={t('searchAlerts.heading')} className="surface absolute start-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] p-2 shadow-xl">
          <p className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wide text-subtle uppercase">{t('searchAlerts.heading')}</p>
          {failed ? (
            <p className="px-2 py-2 text-sm text-danger" role="alert">{t('common.somethingWrong')}</p>
          ) : searches === null ? (
            <p className="px-2 py-2 text-sm text-subtle">{t('common.loading')}</p>
          ) : searches.length ? (
            <ul className="max-h-72 overflow-y-auto">
              {searches.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-1.5 text-sm text-ink hover:bg-raised hover:no-underline"
                  >
                    <span className="block truncate font-medium">{searchAlertName(s)}</span>
                    {s.label?.trim() ? <span className="block truncate font-mono text-xs text-subtle">{s.query}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-2 text-sm text-subtle">{t('searchAlerts.empty')}</p>
          )}
          <Link
            href="/profile/notifications"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-md border-t border-line px-2 pt-2 pb-1.5 text-sm text-link hover:no-underline"
          >
            {t('searchAlerts.manage')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
