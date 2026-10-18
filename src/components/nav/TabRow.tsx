'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';

// The sideways-scrolling names of AdminTabs and ProfileTabs. The scrollbar is
// hidden, so a row wider than its space would just end mid-name with nothing
// to say more is there: an arrow at each end that has names past it - over a
// fade into the page - scrolls most of the row's width that way. `current`
// brings the picked tab into view when it changes.
export function TabRow({ current, children }: { current: string; children: ReactNode }) {
  const t = useT();
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const picked = row.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = row.current;
    if (picked && box && (picked.offsetLeft < box.scrollLeft || picked.offsetLeft + picked.offsetWidth > box.scrollLeft + box.clientWidth)) {
      box.scrollLeft = picked.offsetLeft + picked.offsetWidth - box.clientWidth;
    }
  }, [current]);

  useEffect(() => {
    const box = row.current;
    if (!box) return;
    // A pixel of slack: a zoomed page scrolls to fractions short of the end.
    const measure = () =>
      setMore({ before: box.scrollLeft > 1, after: box.scrollLeft + box.clientWidth < box.scrollWidth - 1 });
    measure();
    box.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    return () => {
      box.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, []);

  const step = (way: -1 | 1) => row.current?.scrollBy({ left: way * row.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div dir="ltr" className="relative -mb-px flex min-w-0">
      <div ref={row} className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none] sm:gap-3">
        {children}
      </div>
      {more.before ? <Arrow side="before" label={t('media.previous')} onStep={() => step(-1)} /> : null}
      {more.after ? <Arrow side="after" label={t('media.next')} onStep={() => step(1)} /> : null}
    </div>
  );
}

// Clear of the underline (bottom-0.5), so the picked tab's still shows under it.
function Arrow({ side, label, onStep }: { side: 'before' | 'after'; label: string; onStep: () => void }) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 bottom-0.5 flex items-center ${
        side === 'before' ? 'start-0 bg-linear-to-r pe-6' : 'end-0 justify-end bg-linear-to-l ps-6'
      } from-page from-60% to-transparent`}
    >
      <button
        type="button"
        aria-label={label}
        tabIndex={-1}
        onClick={onStep}
        className="pointer-events-auto flex rounded-full p-1.5 text-muted hover:bg-raised hover:text-ink active:scale-90"
      >
        <Icon name="chevron" className={`size-5 ${side === 'before' ? 'rotate-90' : '-rotate-90'}`} />
      </button>
    </div>
  );
}
