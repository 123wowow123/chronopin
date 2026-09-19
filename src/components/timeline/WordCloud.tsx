'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TagCount } from '@/lib/tags';
import {
  cloudShape,
  cloudWeights,
  colorFor,
  DARK_PALETTE,
  fitScale,
  isVertical,
  layoutCloud,
  LIGHT_PALETTE,
  scalesFrom,
  shapeArea,
  type CloudWord,
  type PlacedWord,
  type Sprite,
} from '@/lib/wordCloud';
import { useT } from '@/lib/client/i18n';
import { categoryLabel } from '@/lib/i18n/labels';

// px per board cell: fine enough for small words to sit inside big ones' gaps.
const CELL = 2;
// How far from the pointer words still feel it (px, from their edges), and
// how hard. Gentle: a word must never slide away from a pointer heading for it.
const REACH = 130;
const PUSH = 14;
const SWELL = 0.16;
const HOT_SWELL = 0.22;
// How far (px) the whole cloud drifts against the pointer, for depth. Flat,
// not a 3D tilt: a perspective would draw edge words tens of px from where
// the pointer is judged against.
const DRIFT = 10;
const EASE = 0.18;

// The word picked from the keyboard, kept focused through the search it
// starts: the navigation drops the focus to the page a moment later, and a
// remount would replace the word. Only for a moment, so a later blur stands.
let refocusKey: string | null = null;
let refocusUntil = 0;

type Box = { cx: number; cy: number; minX: number; maxX: number; minY: number; maxY: number };
type Layout = { width: number; height: number; placed: PlacedWord[]; boxes: Map<string, Box>; palette: string[] };

const fontWeight = (weight: number) => (weight > 0.66 ? 800 : weight > 0.33 ? 700 : 600);

// Draws words on one canvas to find the cells they ink, keeping each word's
// box (px, around its anchor) for the pointer effects.
function spriteMaker(family: string, boxes: Map<string, Box>) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return (word: CloudWord, size: number): Sprite => {
    const font = `${fontWeight(word.weight)} ${size}px ${family}`;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(word.text);
    // Around the anchor before turning: x from -left to right, y from -ascent to descent.
    let [minX, maxX, minY, maxY] = [-m.actualBoundingBoxLeft, m.actualBoundingBoxRight, -m.actualBoundingBoxAscent, m.actualBoundingBoxDescent];
    // Turned a quarter anticlockwise, (x, y) goes to (y, -x).
    if (word.vertical) [minX, maxX, minY, maxY] = [minY, maxY, -maxX, -minX];
    const margin = 2;
    canvas.width = Math.ceil(maxX - minX) + margin * 2;
    canvas.height = Math.ceil(maxY - minY) + margin * 2;
    const ax = -minX + margin;
    const ay = -minY + margin;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.translate(ax, ay);
    if (word.vertical) ctx.rotate(-Math.PI / 2);
    ctx.fillText(word.text, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const offX = Math.floor((minX - margin) / CELL);
    const offY = Math.floor((minY - margin) / CELL);
    const cols = Math.floor((maxX + margin) / CELL) - offX + 1;
    const rows = Math.floor((maxY + margin) / CELL) - offY + 1;
    const cells = new Uint8Array(cols * rows);
    const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < width; px++) {
        if (data[(py * width + px) * 4 + 3] < 40) continue;
        const cx = Math.floor((px - ax) / CELL) - offX;
        const cy = Math.floor((py - ay) / CELL) - offY;
        if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) cells[cy * cols + cx] = 1;
      }
    }
    boxes.set(`${word.key}|${size}`, { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, minX, maxX, minY, maxY });
    return { cols, rows, offX, offY, cells };
  };
}

// Whether the page is dark: the body's own background, whatever set it.
function isDark() {
  const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

// Tags as a WordArt-style cloud: packed by their glyphs into a cloud shape,
// a quarter of them running upward, in a many-coloured palette, sized by how
// many pins carry each. The pointer makes it flow: words near it swell and
// part around it, the one under it comes forward while the rest fade back,
// and the whole cloud drifts against it. Laid out again whenever its box
// changes size. Tab reaches every word; Enter or Space picks it.
export function WordCloud({
  tags,
  selected,
  onToggle,
  onHot,
}: {
  tags: TagCount[];
  selected: string[];
  onToggle: (name: string) => void;
  // The tag under the pointer or focus, for the caller to describe.
  onHot?: (tag: TagCount | null) => void;
}) {
  const id = useId().replace(/:/g, '');
  const translate = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [hot, setHot] = useState<string | null>(null);

  // Follows the box's size, settling before a layout rather than on every frame of a resize.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(([entry]) => {
      clearTimeout(timer);
      const { width, height } = entry.contentRect;
      timer = setTimeout(() => setSize({ width: Math.round(width), height: Math.round(height) }), 120);
    });
    observer.observe(box);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const words = useMemo(() => {
    const busiest = [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const weights = cloudWeights(busiest.map((t) => t.count));
    return busiest.map((t, rank) => ({ key: t.name.toLowerCase(), text: t.kind === 'category' ? categoryLabel(translate, t.name) : t.name, weight: weights[rank], vertical: isVertical(t.name.toLowerCase(), rank) }));
  }, [tags, translate]);

  useEffect(() => {
    if (!size || size.width < 80 || size.height < 80) return;
    let cancelled = false;
    // Measured in the font the words are drawn in, once it has loaded.
    document.fonts.ready.then(() => {
      if (cancelled || !svgRef.current) return;
      const family = getComputedStyle(svgRef.current).fontFamily;
      const boxes = new Map<string, Box>();
      const { width, height } = size;
      const maxSize = Math.min(110, Math.max(26, Math.min(width, height) / 5.2));
      const minSize = width < 500 ? 11 : 12;
      const sizeFor = (weight: number, scale: number) => Math.max(10, Math.round((minSize + (maxSize - minSize) * weight ** 1.1) * scale));
      const inside = cloudShape(width, height);
      // A first guess at how small the words must be to fit them all, from
      // their widths at scale 1 (about 0.6em a letter in bold) and heights.
      const start = fitScale(
        words.map((w) => (w.text.length * 0.6 + 0.4) * sizeFor(w.weight, 1) ** 2 * 1.15),
        shapeArea(width, height, inside),
      );
      const placed = layoutCloud(words, {
        width,
        height,
        cell: CELL,
        inside,
        sizeFor,
        sprite: spriteMaker(family, boxes),
        pad: 1,
        scales: scalesFrom(Math.min(1, start * 1.15), 9, 0.9),
      });
      const kept = new Map<string, Box>();
      for (const p of placed) kept.set(p.key, boxes.get(`${p.key}|${p.size}`)!);
      setLayout({ width, height, placed, boxes: kept, palette: isDark() ? DARK_PALETTE : LIGHT_PALETTE });
    });
    return () => {
      cancelled = true;
    };
  }, [size, words]);

  useEffect(() => {
    if (!layout || !refocusKey) return;
    const word = svgRef.current?.querySelector<SVGGElement>(`[data-flow="${CSS.escape(refocusKey)}"]`);
    if (Date.now() < refocusUntil && !document.activeElement?.closest('[data-flow]')) word?.focus();
  }, [layout]);

  const byKey = useMemo(() => new Map(tags.map((t) => [t.name.toLowerCase(), t])), [tags]);
  const picked = useMemo(() => new Set(selected.map((s) => s.toLowerCase())), [selected]);
  const hotTag = hot ? (byKey.get(hot) ?? null) : null;
  // Each word's resting box (px): what the pointer is over is judged against
  // these rather than where a word has flowed to, so it holds still.
  const rects = useMemo(
    () =>
      (layout?.placed ?? []).map((p) => {
        const box = layout!.boxes.get(p.key)!;
        return { key: p.key, left: p.x + box.minX, right: p.x + box.maxX, top: p.y + box.minY, bottom: p.y + box.maxY, cx: p.x + box.cx, cy: p.y + box.cy };
      }),
    [layout],
  );
  useEffect(() => onHot?.(hotTag), [hotTag, onHot]);

  // The flow, driven outside React: each frame eases every word toward where
  // the pointer wants it and stops once nothing is still moving.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hotRef = useRef<string | null>(null);
  const kick = useRef<() => void>(() => {});
  // The cloud's current drift, taken off the pointer before it is judged.
  const drift = useRef({ x: 0, y: 0 });
  useEffect(() => {
    hotRef.current = hot;
    kick.current();
  }, [hot]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!layout || !svg) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = rects.map((r) => ({ ...r, el: svg.querySelector<SVGGElement>(`[data-flow="${CSS.escape(r.key)}"]`), dx: 0, dy: 0, s: 1 }));
    const shift = drift.current;
    let frame = 0;
    const step = () => {
      frame = 0;
      let moving = false;
      const at = pointer.current;
      // The hot word's copy on top follows the word.
      const top = svg.querySelector<SVGGElement>('[data-top]');
      const approach = (from: number, to: number) => {
        const next = from + (to - from) * EASE;
        if (Math.abs(to - next) > 0.002) moving = true;
        return Math.abs(to - next) > 0.002 ? next : to;
      };
      for (const item of items) {
        let tx = 0;
        let ty = 0;
        let ts = 1;
        if (at) {
          // How near the pointer is to the word's edge, and which way is away.
          const edge = Math.hypot(Math.max(item.left - at.x, 0, at.x - item.right), Math.max(item.top - at.y, 0, at.y - item.bottom));
          const near = Math.max(0, 1 - edge / REACH);
          const f = near * near * (3 - 2 * near);
          const isHot = item.key === hotRef.current;
          const away = Math.hypot(item.cx - at.x, item.cy - at.y) || 1;
          tx = isHot ? 0 : ((item.cx - at.x) / away) * PUSH * f;
          ty = isHot ? 0 : ((item.cy - at.y) / away) * PUSH * f;
          ts = 1 + SWELL * f + (isHot ? HOT_SWELL : 0);
        }
        // A swollen word grows about its centre, so one near an edge would
        // leave the box: move it inwards by what it overhangs (the drift,
        // DRIFT px, is allowed for).
        const inset = DRIFT + 2;
        const over = (lo: number, hi: number, limit: number) => (lo < inset ? inset - lo : hi > limit - inset ? limit - inset - hi : 0);
        tx += over(item.cx + tx + (item.left - item.cx) * ts, item.cx + tx + (item.right - item.cx) * ts, layout.width);
        ty += over(item.cy + ty + (item.top - item.cy) * ts, item.cy + ty + (item.bottom - item.cy) * ts, layout.height);
        item.dx = approach(item.dx, tx);
        item.dy = approach(item.dy, ty);
        item.s = approach(item.s, ts);
        const transform = `translate(${item.cx + item.dx} ${item.cy + item.dy}) scale(${item.s}) translate(${-item.cx} ${-item.cy})`;
        item.el?.setAttribute('transform', transform);
        if (top?.dataset.top === item.key) top.setAttribute('transform', transform);
      }
      shift.x = approach(shift.x, at ? -(at.x / layout.width - 0.5) * 2 * DRIFT : 0);
      shift.y = approach(shift.y, at ? -(at.y / layout.height - 0.5) * 2 * DRIFT : 0);
      svg.style.transform = `translate(${shift.x}px, ${shift.y}px)`;
      if (moving) frame = requestAnimationFrame(step);
    };
    kick.current = () => {
      if (!still && !frame) frame = requestAnimationFrame(step);
    };
    return () => {
      cancelAnimationFrame(frame);
      kick.current = () => {};
      svg.style.transform = '';
      shift.x = 0;
      shift.y = 0;
    };
  }, [layout, rects]);

  // The word at a point of the box, by resting boxes.
  const wordAt = (event: { clientX: number; clientY: number }) => {
    const rect = boxRef.current!.getBoundingClientRect();
    const at = { x: event.clientX - rect.left - drift.current.x, y: event.clientY - rect.top - drift.current.y };
    return { at, over: rects.find((r) => at.x >= r.left - 3 && at.x <= r.right + 3 && at.y >= r.top - 3 && at.y <= r.bottom + 3) };
  };
  const movePointer = (event: React.PointerEvent) => {
    const { at, over } = wordAt(event);
    pointer.current = at;
    setHot(over?.key ?? null);
    kick.current();
  };
  // A click picks the word whose resting box it lands in, wherever the flow
  // has carried the drawing for that moment.
  // The word drawn under it first; in a gap, the resting box it is in.
  const click = (event: React.MouseEvent) => {
    const drawn = (event.target as Element).closest?.('[data-flow]')?.getAttribute('data-flow');
    const key = drawn ?? wordAt(event).over?.key;
    const tag = key && byKey.get(key);
    if (tag) onToggle(tag.name);
  };
  const leave = () => {
    pointer.current = null;
    setHot(null);
    kick.current();
  };
  // Focus brings the same lens to a word as the pointer would.
  const focusWord = (p: PlacedWord) => {
    const box = layout?.boxes.get(p.key);
    if (box) pointer.current = { x: p.x + box.cx, y: p.y + box.cy };
    setHot(p.key);
  };

  const unplaced = layout ? tags.length - layout.placed.length : 0;
  const hotPlaced = hot ? layout?.placed.find((p) => p.key === hot) : undefined;

  return (
    <div ref={boxRef} className="absolute inset-0" onPointerMove={movePointer} onPointerLeave={leave} onClick={click}>
      <svg
        ref={svgRef}
        width={layout?.width ?? 0}
        height={layout?.height ?? 0}
        className="absolute inset-0 overflow-visible select-none"
        data-hovering={hot ? '' : undefined}
      >
        <style>{`
          #${id} .word text { transition: opacity 180ms ease, filter 180ms ease; }
          svg[data-hovering] #${id} .word:not([data-hot]) text { opacity: 0.32; }
          #${id} .word[data-hot] text { filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.28)); }
          #${id} .word { cursor: pointer; outline: none; }
          #${id} .word .ring { stroke-opacity: 0; transition: stroke-opacity 120ms; }
          #${id} .word:focus-visible .ring { stroke-opacity: 1; }
        `}</style>
        {layout ? (
          <g id={id} role="group" aria-label={translate('tagCloud.filterBy')}>
            {layout.placed.map((p) => {
              const tag = byKey.get(p.key);
              const count = tag?.count ?? 0;
              return (
                <g
                  key={p.key}
                  data-flow={p.key}
                  className="word"
                  data-hot={hot === p.key ? '' : undefined}
                  role="button"
                  tabIndex={0}
                  aria-pressed={picked.has(p.key)}
                  aria-label={`${p.text}, ${translate('tagCloud.pins', { count })}`}
                  onFocus={() => focusWord(p)}
                  onBlur={(event) => {
                    const word = event.currentTarget;
                    if (refocusKey === p.key && !event.relatedTarget && Date.now() < refocusUntil) {
                      requestAnimationFrame(() => word.isConnected && !document.activeElement?.closest('[data-flow]') && word.focus());
                      return;
                    }
                    setHot((h) => (h === p.key ? null : h));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      refocusKey = p.key;
                      refocusUntil = Date.now() + 3000;
                      onToggle(p.text);
                    }
                  }}
                >
                  <WordDrawing word={p} box={layout.boxes.get(p.key)!} palette={layout.palette} pressed={picked.has(p.key)} nomination={tag?.kind === 'nomination'} />
                </g>
              );
            })}
            {/* The word under the pointer drawn again on top, over any it
                swells across. A copy rather than moving the word itself to
                the end, which would blur it when it holds the focus. */}
            {hotPlaced ? (
              <g data-top={hotPlaced.key} className="word" data-hot="" aria-hidden pointerEvents="none">
                <WordDrawing
                  word={hotPlaced}
                  box={layout.boxes.get(hotPlaced.key)!}
                  palette={layout.palette}
                  pressed={picked.has(hotPlaced.key)}
                  nomination={byKey.get(hotPlaced.key)?.kind === 'nomination'}
                />
              </g>
            ) : null}
          </g>
        ) : null}
      </svg>
      {!layout && tags.length ? (
        <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-subtle">
          Arranging tags…
        </p>
      ) : null}
      {unplaced > 0 ? (
        <p className="pointer-events-none absolute right-3 bottom-2 text-xs text-subtle">
          {unplaced} more {unplaced === 1 ? 'tag' : 'tags'} — find by name
        </p>
      ) : null}
    </div>
  );
}

// A word as drawn: a tinted pill behind it when picked, a ring for focus, the
// text itself (turned for a vertical word). A nomination's is a little paler.
function WordDrawing({ word: p, box, palette, pressed, nomination }: { word: PlacedWord; box: Box; palette: string[]; pressed: boolean; nomination: boolean }) {
  return (
    <>
      <rect
        x={p.x + box.minX - 4}
        y={p.y + box.minY - 3}
        width={box.maxX - box.minX + 8}
        height={box.maxY - box.minY + 6}
        rx={6}
        className={pressed ? 'fill-accent/20 stroke-accent/70' : 'fill-transparent stroke-none'}
        strokeWidth={1.5}
      />
      <rect x={p.x + box.minX - 5} y={p.y + box.minY - 4} width={box.maxX - box.minX + 10} height={box.maxY - box.minY + 8} rx={7} className="ring fill-none stroke-link" strokeWidth={2} />
      <text
        transform={`translate(${p.x} ${p.y})${p.vertical ? ' rotate(-90)' : ''}`}
        textAnchor="middle"
        fontSize={p.size}
        fontWeight={fontWeight(p.weight)}
        fill={colorFor(p.key, palette)}
        fillOpacity={nomination && !pressed ? 0.7 : 1}
        textDecoration={pressed ? 'underline' : undefined}
      >
        {p.text}
      </text>
    </>
  );
}
