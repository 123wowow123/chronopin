'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MAX_WEB_LINKS, MIN_WEB_STRENGTH, WEB_KIND_WEIGHT, WEB_KINDS } from '@/lib/pinWeb';
import { useT } from '@/lib/client/i18n';

// A tag on this many pins, as an example of what commonness costs a share.
const COMMON_TAG_PINS = 30;

// The key to the lines drawn between pins: a colour and a name for each kind
// of relation, and an ⓘ that opens how a pair earns a line at all — the sum
// the map scores them on, rather than the kinds the row already names.
export function WebLegend() {
  const t = useT();
  const helpId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Clicking (or Escape) anywhere but the panel puts it away, as the map's
  // other panels do. On the click, not the press, so a control under it is
  // still where it was aimed when the panel goes.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && document.contains(target) && !rootRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('click', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  // The numbers the map really scores by, so the panel cannot drift from it.
  const scores = {
    full: WEB_KIND_WEIGHT.company,
    tag: WEB_KIND_WEIGHT.tag,
    min: MIN_WEB_STRENGTH,
    links: MAX_WEB_LINKS,
    pins: COMMON_TAG_PINS,
    common: Math.round((WEB_KIND_WEIGHT.tag / Math.log2(COMMON_TAG_PINS)) * 100) / 100,
  };

  return (
    <div ref={rootRef} className="flex w-full flex-col items-start gap-2">
      {open ? (
        <div id={helpId} className="floating flex w-full flex-col gap-1.5 px-3.5 py-3 text-xs text-subtle">
          <p className="text-sm font-semibold text-ink">{t('map.webHelpTitle')}</p>
          <p>{t('map.webHelpScore', scores)}</p>
          <p>{t('map.webHelpThreshold', scores)}</p>
          <p>{t('map.webHelpDeclared')}</p>
          <p>{t('map.webHelpCap', scores)}</p>
        </div>
      ) : null}
      <p className="floating flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-full py-1 pr-1 pl-2.5 text-xs text-subtle">
        {WEB_KINDS.map(({ kind, color }) => (
          <span key={kind} className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3" style={{ backgroundColor: color }} />
            {t(`map.web.${kind}`)}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={open ? helpId : undefined}
          aria-label={t('map.webHelpTitle')}
          className="rounded-full p-1 text-muted hover:text-ink"
        >
          <Icon name="info" className="size-4" />
        </button>
      </p>
    </div>
  );
}
