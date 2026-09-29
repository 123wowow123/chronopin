'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { approxDays, eventSpanSummary, formatSpan, parseTypedSpan, spanExample } from '@/lib/postedSpan';
import { mergedSection, useInControlsFold, useInDrawerPanel, useMergedPanel, useSliderTyping } from './FloatingControls';
import { PanelHeader, useFold } from './PanelHeader';
import { useT } from '@/lib/client/i18n';

type Side = 'past' | 'future';

// A range of time around now, dragged in whole steps or typed exactly. The
// timeline uses one side ("posted within"); the map uses both (past and
// future windows around now). A null span means unbounded ("All").
export function TimeRangeSlider({
  steps,
  past,
  future = null,
  pastOnly = false,
  collapsible = false,
  onChange,
}: {
  steps: string[];
  past: string | null;
  future?: string | null;
  pastOnly?: boolean;
  // From xl up, folds the whole slider behind a row saying what it is set to,
  // as the tag panel folds behind its own: the timeline stacks several of
  // these, and a column of sliders leaves no room for what sits under them.
  // Between lg and xl there is no column and no room to spare - the slider is
  // already behind a pill - so it stays out, heading and all. In the nav
  // drawer it always folds, whatever is asked for here.
  collapsible?: boolean;
  onChange: (value: { past: string | null; future: string | null }) => void;
}) {
  const maxIndex = steps.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ side: Side | null; rect: DOMRect } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // Folded away by default (xl and up only), and left as the viewer last had
  // it across the remounts a narrowed timeline goes through.
  const [open, setOpen] = useFold(pastOnly ? 'posted' : 'span');
  const bodyId = useId();
  const [texts, setTexts] = useState({ past: '', future: '' });
  const [invalid, setInvalid] = useState({ past: false, future: false });

  // Folded behind a pill that already says "Posted within …", the heading
  // would only repeat it.
  const inFold = useInControlsFold();
  // In the nav drawer every slider folds behind its own header, as a
  // collapsible one does in the xl column: the drawer holds the nav rows and
  // the other filters as well, and a slider unfolded takes the room they need.
  const inDrawer = useInDrawerPanel();
  const folds = collapsible || inDrawer;
  // A section of the xl column's one "Filters" panel: always open in it.
  const merged = useMergedPanel() !== null;
  // The admin setting: off, no typed box, no presets and no pencil to open them.
  const typing = useSliderTyping();
  const t = useT();
  const span = (within: string) => formatSpan(within, t.locale);
  const headless = pastOnly && inFold;
  const zeroIndex = steps.findIndex((s) => approxDays(s) === 0);
  const label = (within: string | null) => (within ? span(within) : t('common.all'));

  // The step nearest a span on a log scale, to place a thumb for a typed value.
  function nearestIndex(within: string | null): number {
    if (!within) return maxIndex;
    const target = approxDays(within);
    if (target == null || !steps.length) return maxIndex;
    if (target === 0) return Math.max(zeroIndex, 0);
    let best = 0;
    let bestDistance = Infinity;
    steps.forEach((step, i) => {
      const days = approxDays(step);
      if (!days) return;
      const distance = Math.abs(Math.log(days) - Math.log(target));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  const pastIndex = nearestIndex(past);
  const futureIndex = nearestIndex(future);
  const fromCenter = (index: number) => (maxIndex ? (index / maxIndex) * 50 : 0);
  const pastPosition = pastOnly ? fromCenter(pastIndex) * 2 : 50 - fromCenter(pastIndex);
  const futurePosition = 50 + fromCenter(futureIndex);

  const latest = useRef({ past, future, onChange });
  useLayoutEffect(() => {
    latest.current = { past, future, onChange };
  });

  function apply(nextPast: string | null, nextFuture: string | null) {
    if (nextPast === latest.current.past && nextFuture === latest.current.future) return;
    setTexts({ past: label(nextPast) || '', future: label(nextFuture) || '' });
    setInvalid({ past: false, future: false });
    latest.current.onChange({ past: nextPast, future: nextFuture });
  }

  function applySide(side: Side, within: string | null) {
    apply(side === 'past' ? within : latest.current.past, side === 'future' ? within : latest.current.future);
  }

  const withinForIndex = (index: number) => (index >= steps.length ? null : steps[index]);
  // Each side's step nearest now, as the "Now" tick sets them.
  const minPast = withinForIndex(Math.max(zeroIndex, 0));
  const minFuture = steps.find((s) => (approxDays(s) ?? 0) > 0) ?? null;

  // A pointer position on the track to the nearest step on the dragged side,
  // clamped so it never crosses "Now" onto the other side.
  function applyPointer(clientX: number) {
    const d = drag.current;
    if (!d) return;
    const percent = ((clientX - d.rect.left) / d.rect.width) * 100;
    if (pastOnly) {
      applySide('past', withinForIndex(Math.round((Math.min(Math.max(percent, 0), 100) / 100) * maxIndex)));
      return;
    }
    if (!d.side) {
      if (percent === 50) return;
      d.side = percent < 50 ? 'past' : 'future';
    }
    const fromMid = d.side === 'past' ? Math.min(Math.max(50 - percent, 0), 50) : Math.min(Math.max(percent - 50, 0), 50);
    applySide(d.side, withinForIndex(Math.round((fromMid / 50) * maxIndex)));
  }

  useEffect(() => {
    const move = (event: PointerEvent) => applyPointer(event.clientX);
    const up = () => {
      drag.current = null;
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

  function startDrag(side: Side, event: React.PointerEvent<HTMLElement>, thumb?: HTMLElement) {
    event.preventDefault();
    event.stopPropagation();
    const rect = trackRef.current!.getBoundingClientRect();
    // Stacked thumbs on "Now": the drag direction decides which side moves.
    drag.current = { side: !pastOnly && pastIndex === 0 && futureIndex === 0 ? null : side, rect };
    thumb?.focus();
  }

  // Pressing anywhere on the track jumps there and keeps dragging.
  function startTrackDrag(event: React.PointerEvent<HTMLElement>) {
    const rect = trackRef.current!.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    const side: Side = pastOnly || percent < 50 ? 'past' : 'future';
    startDrag(side, event, rootRef.current?.querySelector<HTMLElement>(`[data-thumb="${side}"]`) ?? undefined);
    drag.current!.side = side;
    applyPointer(event.clientX);
  }

  function onKeyDown(side: Side, event: React.KeyboardEvent) {
    const delta = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[event.key];
    if (delta == null && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = side === 'past' ? pastIndex : futureIndex;
    // In dual mode the past thumb grows leftward, so arrows invert for it.
    const signed = side === 'past' && !pastOnly ? -(delta ?? 0) : delta ?? 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? maxIndex : index + signed;
    applySide(side, withinForIndex(Math.min(Math.max(next, 0), maxIndex)));
  }

  function applyTyped(side: Side) {
    const within = parseTypedSpan(texts[side], zeroIndex !== -1);
    if (!within) {
      setInvalid((v) => ({ ...v, [side]: true }));
      return;
    }
    applySide(side, within);
  }

  const panelRow = (side: Side) => (
    <div key={side}>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applyTyped(side);
        }}
      >
        <span className="w-24 text-xs text-muted">{pastOnly ? t('controls.postedWithin') : side === 'past' ? t('slider.past') : t('slider.future')}</span>
        <input
          type="text"
          value={texts[side]}
          placeholder={spanExample(t.locale)}
          autoComplete="off"
          onChange={(event) => setTexts((t) => ({ ...t, [side]: event.target.value }))}
          onKeyDown={(event) => event.key === 'Escape' && setPanelOpen(false)}
          className={`field min-w-0 flex-1 px-2 py-1 text-sm max-lg:py-2 ${invalid[side] ? 'ring-red-500' : ''}`}
        />
        <button type="submit" className="btn btn-sm btn-primary py-1.5 max-lg:px-4 max-lg:py-2.5">
          {t('slider.set')}
        </button>
      </form>
      <div className="mt-1.5 mb-2 flex flex-wrap gap-1 max-lg:mt-2.5 max-lg:gap-2">
        {steps.map((step) => (
          <button key={step} type="button" onClick={() => applySide(side, step)} className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-ink max-lg:px-3.5 max-lg:py-2 max-lg:text-sm ring-1 ring-line ring-inset hover:bg-raised-2">
            {span(step)}
          </button>
        ))}
        <button type="button" onClick={() => applySide(side, null)} className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-ink max-lg:px-3.5 max-lg:py-2 max-lg:text-sm ring-1 ring-line ring-inset hover:bg-raised-2">
          {t('common.all')}
        </button>
      </div>
    </div>
  );

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
      <button type="button" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} aria-label={t('slider.typeExact')} title={t('slider.typeExact')} className={className}>
        <Icon name="pencil" className="size-4" />
      </button>
    );

  return (
    <div ref={rootRef} data-no-swipe className={`floating text-sm ${folds ? '' : 'px-3.5 pt-2.5 pb-3'} ${merged ? mergedSection : ''}`}>
      {folds ? (
        <PanelHeader
          caption={pastOnly ? t('controls.postedWithin') : t('controls.timeSpan')}
          captionClass={pastOnly ? 'font-semibold text-past' : 'font-semibold text-ink'}
          value={pastOnly ? label(past) || '' : eventSpanSummary(past, future, t.locale)}
          open={open}
          onToggle={() => setOpen(!open)}
          controls={bodyId}
          reset={past || future ? { label: pastOnly ? t('slider.anyTime') : t('slider.anyTimeBoth'), onClick: () => apply(null, null) } : undefined}
          className={inDrawer ? '' : 'max-xl:hidden'}
          fixed={merged}
        />
      ) : null}
      <div
        id={bodyId}
        className={folds ? `px-3.5 pb-3 in-[[data-drawer-controls]]:px-2 ${inDrawer ? (open || merged ? '' : 'hidden') : `max-xl:pt-2.5 ${open || merged ? '' : 'xl:hidden'}`}` : ''}
      >
        {/* The heading. From xl up the fold's own row above says all this,
            so it goes; with both sides, equal outer columns keep the pencil on
            the centre line, above "Now" and the track's midpoint, whatever the
            labels say. */}
        <div
          className={
            pastOnly
              ? `flex items-start justify-between gap-2 ${folds ? (inDrawer ? 'hidden' : 'xl:hidden') : headless ? 'max-xl:hidden' : ''}`
              : 'grid grid-cols-[1fr_auto_1fr] items-start gap-2'
          }
        >
          <button
            type="button"
            className="-mx-1.5 justify-self-start rounded-md px-1.5 text-left transition-colors hover:bg-raised active:bg-raised-2 max-lg:-my-3 max-lg:py-3"
            // Both sides: the label toggles its side between "All" and nearest now.
            onClick={() => applySide('past', pastOnly || past ? null : minPast)}
            title={pastOnly ? t('slider.anyTime') : past ? t('slider.allPast') : t('slider.sideToNow')}
          >
            <span className="font-semibold text-past">{pastOnly ? t('controls.postedWithin') : t('slider.past')}</span>{' '}
            <span className={pastOnly ? 'text-ink' : 'block text-ink'}>{label(past)}</span>
          </button>
          {typeButton(`-m-1.5 rounded-md p-1.5 text-subtle hover:bg-raised hover:text-ink max-lg:hidden ${headingPencil}`)}
          {!pastOnly ? (
            // col-start-3: the pencil between them is hidden on touch screens,
            // and without it this would land in the middle column.
            <button type="button" className="col-start-3 -mx-1.5 justify-self-end rounded-md px-1.5 text-right transition-colors hover:bg-raised active:bg-raised-2 max-lg:-my-3 max-lg:py-3" onClick={() => applySide('future', future ? null : minFuture)} title={future ? t('slider.allUpcoming') : t('slider.sideToNow')}>
              <span className="font-semibold text-future">{t('slider.future')}</span>
              <span className="block text-ink">{label(future)}</span>
            </button>
          ) : null}
        </div>

        {/* Labels in their own row, clear of the thumbs. */}
        <div
          className={`flex items-center justify-between max-lg:mb-2 ${
            folds ? (inDrawer ? 'mt-0' : 'mt-2 xl:mt-0') : headless ? 'mt-2 max-xl:mt-0' : 'mt-2'
          }`}
        >
          {pastOnly ? (
            <>
              {steps.length ? (
                <button type="button" className={`${tickClass} -ml-1`} onClick={() => applySide('past', steps[0])} title={t('slider.postedWithinSpan', { span: span(steps[0]) ?? '' })}>
                  {span(steps[0])}
                </button>
              ) : (
                <span />
              )}
              <button type="button" className={`${tickClass} -mr-1`} onClick={() => applySide('past', null)} title={t('slider.anyTime')}>
                {t('common.all')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${tickClass} mx-auto`}
              onClick={() => apply(minPast, minFuture)}
              title={t('slider.bothToNow')}
            >
              {t('slider.now')}
            </button>
          )}
        </div>

        {/* The track is inset by the thumb's radius, so a thumb at either end
            stays inside the panel; the whole strip (28px, 44px on touch screens) takes a press. */}
        <div className="relative h-7 cursor-pointer touch-none px-2.5 max-lg:h-11 max-lg:px-3.5" onPointerDown={startTrackDrag}>
          <div ref={trackRef} className="relative top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-raised-2 max-lg:h-2">
            <div
              className="absolute h-full rounded-full bg-past"
              style={{ left: `${pastOnly ? 0 : pastPosition}%`, width: `${(pastOnly ? pastPosition : 50) - (pastOnly ? 0 : pastPosition)}%` }}
            />
            {!pastOnly ? <div className="absolute h-full rounded-full bg-future" style={{ left: '50%', width: `${futurePosition - 50}%` }} /> : null}
            {!pastOnly ? <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted" style={{ left: '50%' }} /> : null}
            <div
              role="slider"
              tabIndex={0}
              data-thumb="past"
              aria-label={t('slider.backTo')}
              aria-valuetext={label(past) || ''}
              aria-valuemin={0}
              aria-valuemax={maxIndex}
              aria-valuenow={pastIndex}
              className={`${thumbClass} bg-past`}
              style={{ left: `${pastPosition}%` }}
              onPointerDown={(event) => startDrag('past', event, event.currentTarget)}
              onKeyDown={(event) => onKeyDown('past', event)}
            />
            {!pastOnly ? (
              <div
                role="slider"
                tabIndex={0}
                data-thumb="future"
                aria-label={t('slider.upTo')}
                aria-valuetext={label(future) || ''}
                aria-valuemin={0}
                aria-valuemax={maxIndex}
                aria-valuenow={futureIndex}
                className={`${thumbClass} bg-future`}
                style={{ left: `${futurePosition}%` }}
                onPointerDown={(event) => startDrag('future', event, event.currentTarget)}
                onKeyDown={(event) => onKeyDown('future', event)}
              />
            ) : null}
          </div>
        </div>

        {/* Under the midpoint, opposite the "Now" tick above it: one press throws
            both sides wide open. */}
        {!pastOnly ? (
          <div className="flex justify-center max-lg:mt-2">
            <button
              type="button"
              className={`${tickClass} leading-none`}
              onClick={() => apply(null, null)}
              aria-label={t('slider.anyTimeBoth')}
              title={t('slider.anyTimeBoth')}
            >
              <Icon name="expand-x" className="size-4 max-lg:size-5" />
            </button>
          </div>
        ) : null}

        {typing ? (
          <div className={`mt-3 border-t border-line pt-3 max-lg:block ${typedShown}`}>
            {panelRow('past')}
            {!pastOnly ? panelRow('future') : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
