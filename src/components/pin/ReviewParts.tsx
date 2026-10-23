'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { PHOTO_TAG_MAX, PHOTO_TAG_MIN_SIZE, type PhotoTag } from '@/lib/userReviews';

// Five stars to pick from; tapping the chosen one again clears it.
export function StarInput({ value, onChange, label, disabled = false }: { value: number; onChange: (stars: number) => void; label: string; disabled?: boolean }) {
  const t = useT();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('reviews.stars', { count: n })}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(value === n ? 0 : n)}
          className="cursor-pointer rounded p-0.5 text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="star" className={`size-6 ${n <= shown ? 'fill-current' : 'text-line'}`} />
        </button>
      ))}
    </div>
  );
}

// The regions of a photo, drawn over it, each named. The overlay fills its
// positioned parent, which must be the same size as the image.
export function TagOverlay({ tags, className = '' }: { tags: PhotoTag[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {tags.map((tag, i) => (
        <div
          key={`${tag.item}-${i}`}
          className="absolute rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%`, width: `${tag.w * 100}%`, height: `${tag.h * 100}%` }}
        >
          <span className="absolute start-0 top-full mt-0.5 max-w-[14rem] truncate rounded bg-black/75 px-1.5 py-0.5 text-[11px] leading-tight text-white">{tag.item}</span>
        </div>
      ))}
    </div>
  );
}

type Draft = { x: number; y: number; w: number; h: number };

// Marks menu items on a chosen photo: drag a rectangle over the dish, then pick
// which menu item it is. Regions are kept as fractions of the picture, so they
// hold at any size.
export function PhotoTagEditor({ src, items, tags, onChange }: { src: string; items: string[]; tags: PhotoTag[]; onChange: (tags: PhotoTag[]) => void }) {
  const t = useT();
  const frame = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<Draft | null>(null);
  const [pending, setPending] = useState<Draft | null>(null);
  const [item, setItem] = useState('');

  const point = (event: React.PointerEvent) => {
    const box = frame.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) };
  };
  const rect = (a: { x: number; y: number }, b: { x: number; y: number }): Draft => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

  function down(event: React.PointerEvent) {
    if (tags.length >= PHOTO_TAG_MAX) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = point(event);
    setPending(null);
    setDrag({ ...origin.current, w: 0, h: 0 });
  }
  function move(event: React.PointerEvent) {
    if (origin.current) setDrag(rect(origin.current, point(event)));
  }
  function up(event: React.PointerEvent) {
    if (!origin.current) return;
    const done = rect(origin.current, point(event));
    origin.current = null;
    setDrag(null);
    if (done.w >= PHOTO_TAG_MIN_SIZE && done.h >= PHOTO_TAG_MIN_SIZE) {
      setPending(done);
      setItem('');
    }
  }
  function add() {
    if (!pending || !item) return;
    onChange([...tags, { item, ...pending }]);
    setPending(null);
  }

  const shown = drag ?? pending;
  return (
    <div className="space-y-2">
      <p className="text-xs text-subtle">{t('reviews.tagHint')}</p>
      <div
        ref={frame}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          origin.current = null;
          setDrag(null);
        }}
        className="relative mx-auto w-fit cursor-crosshair touch-none select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
        <img src={src} alt="" draggable={false} className="block max-h-[60dvh] max-w-full rounded-lg" />
        <TagOverlay tags={tags} />
        {shown ? <div className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent bg-accent/15" style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%` }} /> : null}
      </div>
      {pending ? (
        <div className="flex flex-wrap items-center gap-2">
          <select value={item} onChange={(e) => setItem(e.target.value)} aria-label={t('reviews.tagChoose')} className="min-w-0 max-w-full rounded-md border border-line bg-popover px-2 py-1.5 text-sm text-ink">
            <option value="">{t('reviews.tagChoose')}</option>
            {items.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button type="button" disabled={!item} onClick={add} className="btn btn-primary">
            {t('reviews.tagAdd')}
          </button>
          <button type="button" onClick={() => setPending(null)} className="btn btn-ghost">
            {t('reviews.tagCancel')}
          </button>
        </div>
      ) : null}
      {tags.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <li key={`${tag.item}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-xs text-ink">
              {tag.item}
              <button type="button" aria-label={t('reviews.tagRemove', { item: tag.item })} onClick={() => onChange(tags.filter((_, j) => j !== i))} className="cursor-pointer text-subtle hover:text-ink">
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
