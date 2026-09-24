'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { nearestRadiusIndex, parseRadius, radiusLabel } from '@/lib/radius';
import { mergedSection, useInDrawerPanel, useMergedPanel, useSliderTyping } from './FloatingControls';
import { PanelHeader, useFold } from './PanelHeader';

// A ring around the viewer, dragged in whole steps or typed exactly. The
// timeline narrows to pins whose place falls inside it; a null radius means no
// ring at all ("All"), which is where every timeline starts.
//
// Built like the "posted within" slider next to it (TimeRangeSlider) rather
// than out of it: that one measures spans on both sides of now and speaks in
// months and years, and the two share only the shape of a track with a thumb
// on it. What is shared is the feel - a log scale between the steps, the whole
// strip taking a press, and a typed box that the fold opens on touch screens.
export function DistanceSlider({
  steps,
  radius,
  imperial,
  placeName,
  collapsible = false,
  onChange,
}: {
  // The rings on offer, in kilometres, smallest first.
  steps: number[];
  radius: number | null;
  imperial: boolean;
  // The city the distance is measured from, when the viewer's own position is
  // not what is being measured from; null for their own position.
  placeName?: string | null;
  // From xl up, folds the ring away behind a row saying how wide it is, as
  // the slider above it and the tag panel above that both fold. Narrower it
  // stays out: there it is already behind the controls' pill.
  collapsible?: boolean;
  onChange: (radius: number | null) => void;
}) {
  const maxIndex = steps.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Folded away by default, from xl up.
  const [open, setOpen] = useFold('distance');
  const bodyId = useId();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const t = useT();
  // In the nav drawer the panel folds behind its own header, as in the xl column.
  const inDrawer = useInDrawerPanel();
  const folds = collapsible || inDrawer;
  // A section of the xl column's one "Filters" panel: always open in it.
  const merged = useMergedPanel() !== null;
  // The admin setting: off, no typed box, no presets and no pencil to open them.
  const typing = useSliderTyping();

  const label = (km: number | null) => radiusLabel(km, imperial, t.locale);
  const index = nearestRadiusIndex(radius, steps);
  const position = maxIndex ? (index / maxIndex) * 100 : 0;
  // What the heading's press reaches for when there is no ring yet: wide
  // enough to hold a city and what surrounds it, rather than the tightest
  // ring on offer, which on a quiet day holds nothing at all.
  const suggested = steps[Math.min(3, steps.length - 1)] ?? null;

  const latest = useRef({ radius, onChange });
  useLayoutEffect(() => {
    latest.current = { radius, onChange };
  });

  function apply(next: number | null) {
    if (next === latest.current.radius) return;
    setText(label(next));
    setInvalid(false);
    latest.current.onChange(next);
  }

  const radiusForIndex = (i: number) => (i >= steps.length ? null : steps[i]);

  function applyPointer(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    apply(radiusForIndex(Math.round((percent / 100) * maxIndex)));
  }

  useEffect(() => {
    const move = (event: PointerEvent) => dragging.current && applyPointer(event.clientX);
    const up = () => {
      dragging.current = false;
    };
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('mousedown', outside);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('mousedown', outside);
    };
  });

  // Pressing anywhere on the track jumps there and keeps dragging.
  function startDrag(event: React.PointerEvent<HTMLElement>, thumb?: HTMLElement) {
    event.preventDefault();
    event.stopPropagation();
    dragging.current = true;
    (thumb ?? rootRef.current?.querySelector<HTMLElement>('[data-thumb="radius"]'))?.focus();
    applyPointer(event.clientX);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const delta = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[event.key];
    if (delta == null && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? maxIndex : index + (delta ?? 0);
    apply(radiusForIndex(Math.min(Math.max(next, 0), maxIndex)));
  }

  function applyTyped() {
    const km = parseRadius(text, imperial);
    if (!km) {
      setInvalid(true);
      return;
    }
    apply(km);
  }

  // 20px thumbs with a 36px invisible hit area; 28px with a 44px one on touch screens.
  const thumbClass =
    'absolute top-1/2 size-5 max-lg:size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white shadow-md shadow-shade/50 transition-transform hover:scale-110 after:absolute after:-inset-2 after:content-[""] focus:outline-none focus-visible:ring-2 focus-visible:ring-link active:cursor-grabbing';
  const tickClass = 'rounded-md px-1 py-0.5 text-[11px] text-subtle max-lg:px-2.5 max-lg:py-2 max-lg:text-sm hover:bg-raised hover:text-ink active:bg-raised-2';

  // Inside a fold there is no pencil: the fold is the panel, so opening it
  // shows the typed box too, and closing it hides the lot. Elsewhere (behind
  // the pill below xl) the pencil still opens it, and touch screens always
  // have it.
  const typedShown = panelOpen || inDrawer ? '' : collapsible ? 'hidden xl:block' : 'hidden';
  // The heading's pencil, gone wherever the typed box is always out.
  const headingPencil = inDrawer ? 'hidden' : collapsible ? 'xl:hidden' : '';

  const typeButton = (className: string) =>
    typing && (
      <button type="button" onClick={() => setPanelOpen((shown) => !shown)} aria-expanded={panelOpen} aria-label={t('slider.typeExact')} title={t('slider.typeExact')} className={className}>
        <Icon name="pencil" className="size-4" />
      </button>
    );
  // Whose distance this is, when it is the city of a time zone rather than the
  // viewer's own position - the same thing a card's distance says in its title.
  const measuredFrom = placeName ? <span className="block truncate text-xs text-muted">{t('slider.measuredFrom', { place: placeName })}</span> : null;

  return (
    <div ref={rootRef} data-no-swipe className={`floating text-sm ${folds ? '' : 'px-3.5 pt-2.5 pb-3'} ${merged ? mergedSection : ''}`}>
      {folds ? (
        <PanelHeader
          caption={t('controls.within')}
          captionClass="font-semibold text-link"
          value={label(radius)}
          open={open}
          onToggle={() => setOpen(!open)}
          controls={bodyId}
          reset={radius ? { label: t('slider.anyDistance'), onClick: () => apply(null) } : undefined}
          className={inDrawer ? '' : 'max-xl:hidden'}
          fixed={merged}
        />
      ) : null}
      <div
        id={bodyId}
        className={folds ? `px-3.5 pb-3 in-[[data-drawer-controls]]:px-2 ${inDrawer ? (open || merged ? '' : 'hidden') : `max-xl:pt-2.5 ${open || merged ? '' : 'xl:hidden'}`}` : ''}
      >
        {/* Where the ring is measured from, which the heading carries when it
            is here and the fold's row cannot, being one line. */}
        {folds ? <div className={inDrawer ? '' : 'max-xl:hidden'}>{measuredFrom}</div> : null}
        {/* The heading, which the fold's own row says again from xl up. */}
        <div className={`flex items-start justify-between gap-2 ${folds ? (inDrawer ? 'hidden' : 'xl:hidden') : ''}`}>
          <button
            type="button"
            className="-mx-1.5 min-w-0 justify-self-start rounded-md px-1.5 text-left transition-colors hover:bg-raised active:bg-raised-2 max-lg:-my-3 max-lg:py-3"
            onClick={() => apply(radius ? null : suggested)}
            title={radius ? t('slider.anyDistance') : t('slider.withinRadius', { radius: label(suggested) })}
          >
            <span className="font-semibold text-link">{t('controls.within')}</span> <span className="text-ink">{label(radius)}</span>
            {measuredFrom}
          </button>
          {typeButton(`-m-1.5 shrink-0 rounded-md p-1.5 text-subtle hover:bg-raised hover:text-ink max-lg:hidden ${headingPencil}`)}
        </div>

        {/* Labels in their own row, clear of the thumb. */}
        <div className={`flex items-center justify-between max-lg:mb-2 ${folds ? (inDrawer ? 'mt-1' : 'mt-2 xl:mt-1') : 'mt-2'}`}>
          {steps.length ? (
            <button type="button" className={`${tickClass} -ml-1`} onClick={() => apply(steps[0])} title={t('slider.withinRadius', { radius: label(steps[0]) })}>
              {label(steps[0])}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={`${tickClass} -mr-1`} onClick={() => apply(null)} title={t('slider.anyDistance')}>
            {t('common.all')}
          </button>
        </div>

        {/* The track is inset by the thumb's radius, so a thumb at either end
            stays inside the panel; the whole strip takes a press. */}
        <div className="relative h-7 cursor-pointer touch-none px-2.5 max-lg:h-11 max-lg:px-3.5" onPointerDown={(event) => startDrag(event)}>
          <div ref={trackRef} className="relative top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-raised-2 max-lg:h-2">
            <div className="absolute h-full rounded-full bg-link" style={{ left: 0, width: `${position}%` }} />
            <div
              role="slider"
              tabIndex={0}
              data-thumb="radius"
              aria-label={t('slider.outTo')}
              aria-valuetext={label(radius)}
              aria-valuemin={0}
              aria-valuemax={maxIndex}
              aria-valuenow={index}
              className={`${thumbClass} bg-link`}
              style={{ left: `${position}%` }}
              onPointerDown={(event) => startDrag(event, event.currentTarget)}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>

        {typing ? (
          <div className={`mt-3 border-t border-line pt-3 max-lg:block ${typedShown}`}>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyTyped();
              }}
            >
              <span className="w-24 text-xs text-muted">{t('controls.within')}</span>
              <input
                type="text"
                value={text}
                placeholder={label(steps[Math.min(2, steps.length - 1)] ?? null)}
                autoComplete="off"
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setPanelOpen(false)}
                className={`field min-w-0 flex-1 px-2 py-1 text-sm max-lg:py-2 ${invalid ? 'ring-red-500' : ''}`}
              />
              <button type="submit" className="btn btn-sm btn-primary py-1.5 max-lg:px-4 max-lg:py-2.5">
                {t('slider.set')}
              </button>
            </form>
            <div className="mt-1.5 mb-2 flex flex-wrap gap-1 max-lg:mt-2.5 max-lg:gap-2">
              {[...steps, null].map((step) => (
                <button
                  key={step ?? 'all'}
                  type="button"
                  onClick={() => apply(step)}
                  className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-ink max-lg:px-3.5 max-lg:py-2 max-lg:text-sm ring-1 ring-line ring-inset hover:bg-raised-2"
                >
                  {label(step)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
