'use client';

import { useEffect, useId, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NewPinRow, withLivePin } from '@/components/timeline/NewPins';
import { TrendingRow } from '@/components/timeline/TrendingPins';
import { onLive, onLiveReconnect } from '@/lib/client/liveFeed';
import { withPageLang } from '@/lib/client/navigation';
import { pinConfidence, pinEvidence } from '@/lib/referenceConfidence';
import type { CardPin, NewPin, TrendingPin } from '@/lib/types';
import { useT } from '@/lib/client/i18n';

type Highlights = { trending: { pins: TrendingPin[]; days: number }; newPins: NewPin[]; minConfidence?: number | null };

// The last lists seen, shown at once when the drawer opens again while they
// are fetched anew.
let cached: Highlights | null = null;

// The timeline's trending and new pins panels, which only fit beside the
// cards on wide screens: in the drawer each is a row that folds its list out.
// Fetched each time the drawer opens, so a row whose list comes back empty
// goes before anyone reaches for it, and the new pins list is kept live from
// the page's one feed while the drawer is open, as the wide screen's panel is.
export function DrawerHighlights({ drawerOpen, itemClass }: { drawerOpen: boolean; itemClass: string }) {
  const t = useT();
  const [data, setData] = useState<Highlights | null>(() => cached);
  const [unfolded, setUnfolded] = useState<'trending' | 'new' | null>(null);

  useEffect(() => {
    if (data) cached = data;
  }, [data]);

  useEffect(() => {
    if (!drawerOpen) return;
    let live = true;
    const load = () => {
      fetch(withPageLang('/api/pins/highlights'), { credentials: 'same-origin' })
        .then((res) => (res.ok ? (res.json() as Promise<Highlights>) : null))
        .then((next) => {
          if (next && live) setData(next);
        })
        .catch(() => {});
    };
    load();
    // Pins posted while the stream was down never arrived: fetch them.
    const stopReconnect = onLiveReconnect(load);
    const stops = ['pin:save', 'pin:update', 'pin:remove'].map((type) =>
      onLive<CardPin>(type, (changed) =>
        setData((current) => {
          if (!current) return current;
          const min = current.minConfidence ?? null;
          const confidence = pinConfidence(pinEvidence(changed));
          const belowBar = min !== null && confidence !== undefined && confidence < min;
          return { ...current, newPins: withLivePin(current.newPins, type, changed, belowBar) };
        }),
      ),
    );
    return () => {
      live = false;
      stops.forEach((stop) => stop());
      stopReconnect();
    };
  }, [drawerOpen]);

  const toggle = (which: 'trending' | 'new') => setUnfolded(unfolded === which ? null : which);

  return (
    <>
      {!data || data.trending.pins.length ? (
        <Fold
          icon="trending-up"
          iconClass="text-success"
          label={t('trending.heading')}
          note={data ? t('trending.lastDays', { count: data.trending.days }) : null}
          open={unfolded === 'trending'}
          onToggle={() => toggle('trending')}
          itemClass={itemClass}
        >
          {data?.trending.pins.map((pin) => (
            <li key={pin.id}>
              <TrendingRow pin={pin} />
            </li>
          ))}
        </Fold>
      ) : null}
      {!data || data.newPins.length ? (
        <Fold
          icon="sparkle"
          iconClass="text-link"
          label={t('newPins.heading')}
          note={data ? t('newPins.latest') : null}
          open={unfolded === 'new'}
          onToggle={() => toggle('new')}
          itemClass={itemClass}
        >
          {data?.newPins.map((pin) => (
            <li key={pin.id}>
              <NewPinRow pin={pin} />
            </li>
          ))}
        </Fold>
      ) : null}
    </>
  );
}

function Fold({
  icon,
  iconClass,
  label,
  note,
  open,
  onToggle,
  itemClass,
  children,
}: {
  icon: IconName;
  iconClass: string;
  label: string;
  note: string | null;
  open: boolean;
  onToggle: () => void;
  itemClass: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const id = useId();
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className={`w-full ${itemClass}`}>
        <Icon name={icon} className={`size-6 ${iconClass}`} />
        {label}
        {note ? <span className="ml-auto text-xs font-normal text-subtle">{note}</span> : null}
        <Icon name="chevron" className={`size-4 shrink-0 text-subtle transition-transform ${note ? '' : 'ml-auto'} ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={id} hidden={!open} className="pb-1 text-sm">
        {!children ? <p className="px-4 py-2 text-subtle">{t('common.loading')}</p> : <ol className="flex flex-col">{children}</ol>}
      </div>
    </>
  );
}
