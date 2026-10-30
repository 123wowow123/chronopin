'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/components/pin/PinShare';
import { Icon } from '@/components/ui/Icon';
import { siteUrl } from '@/lib/appConfig';
import { useT } from '@/lib/client/i18n';

// "Subscribe" on a tag, company, person or thread: a menu with the public
// .ics feed (src/app/api/calendar) as a one-click Google Calendar link and a
// copyable URL for every other calendar app.
export function CalendarSubscribe({ kind, slug, thread = false }: { kind: 'tag' | 'company' | 'person' | 'thread'; slug: string; thread?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const feed = `${siteUrl}/api/calendar/${kind}/${encodeURIComponent(slug)}.ics`;
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.replace(/^https?:/, 'webcal:'))}`;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'block w-full rounded-md px-2.5 py-2 text-start text-sm text-ink hover:bg-ink/[0.07] hover:no-underline focus-visible:bg-ink/[0.07] focus-visible:outline-none';
  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink"
      >
        <Icon name="calendar" className="size-3.5" />
        {t(thread ? 'calendar.subscribeThread' : 'calendar.subscribe')}
      </button>
      {open ? (
        <div role="menu" className="surface absolute start-0 top-full z-30 mt-2 w-64 p-1.5 shadow-lg">
          <a role="menuitem" href={google} target="_blank" rel="noopener" onClick={() => setOpen(false)} className={item}>
            <span className="font-medium">{t('calendar.google')}</span>
            <span className="block text-xs text-muted">{t('calendar.googleHint')}</span>
          </a>
          <button
            role="menuitem"
            type="button"
            className={`${item} cursor-pointer`}
            onClick={async () => {
              if (await copyText(feed)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            <span className="font-medium">{copied ? t('calendar.copied') : t('calendar.copy')}</span>
            <span className="block text-xs text-muted">{t('calendar.copyHint')}</span>
          </button>
        </div>
      ) : null}
    </span>
  );
}
