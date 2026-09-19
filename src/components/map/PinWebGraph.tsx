'use client';

import { useEffect, useRef, useState } from 'react';
import { webColor, type WebEdge } from '@/lib/pinWeb';

export type WebNode = { id: number; title: string };

type Body = { id: number; title: string; x: number; y: number; vx: number; vy: number; degree: number };

const NODE_R = 4;

// An Obsidian-style graph of the pins that relate to another one: a small
// force layout (repulsion between every pair, springs along each edge, a pull
// to the middle) on a canvas, drag to move a node, wheel to zoom, click to
// pick one. Pins without any relation are left out; they would only be dots.
export function PinWebGraph({ nodes, edges, selectedId, onSelect }: { nodes: WebNode[]; edges: WebEdge[]; selectedId?: number; onSelect: (id: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const ink = getComputedStyle(canvas).color;
    const byId = new Map<number, Body>();
    const bodies: Body[] = [];
    for (const edge of edges) {
      for (const id of [edge.a, edge.b]) {
        if (byId.has(id)) continue;
        const node = nodes.find((n) => n.id === id);
        if (!node) continue;
        const angle = Math.random() * Math.PI * 2;
        const body = { id, title: node.title, x: Math.cos(angle) * 120 * Math.random(), y: Math.sin(angle) * 120 * Math.random(), vx: 0, vy: 0, degree: 0 };
        byId.set(id, body);
        bodies.push(body);
      }
    }
    const links = edges.filter((e) => byId.has(e.a) && byId.has(e.b)).map((e) => ({ a: byId.get(e.a)!, b: byId.get(e.b)!, kind: e.kind }));
    for (const l of links) {
      l.a.degree++;
      l.b.degree++;
    }

    let width = 0;
    let height = 0;
    const view = { x: 0, y: 0, k: 1 };
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let alpha = 1;
    const step = () => {
      // Every pair repels; capped to bodies near each other so a big graph stays cheap.
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = dx * dx + dy * dy || 0.01;
          if (d2 > 90000) continue;
          const force = (1800 / d2) * alpha;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }
      for (const { a, b } of links) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const pull = ((d - 40) / d) * 0.06 * alpha;
        a.vx += dx * pull;
        a.vy += dy * pull;
        b.vx -= dx * pull;
        b.vy -= dy * pull;
      }
      for (const body of bodies) {
        if (body === dragging) continue;
        body.vx = (body.vx - body.x * 0.01 * alpha) * 0.85;
        body.vy = (body.vy - body.y * 0.01 * alpha) * 0.85;
        body.x += body.vx;
        body.y += body.vy;
      }
      alpha = Math.max(alpha * 0.985, 0.02);
    };

    const toScreen = (x: number, y: number): [number, number] => [width / 2 + view.x + x * view.k, height / 2 + view.y + y * view.k];
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (const { a, b, kind } of links) {
        const [ax, ay] = toScreen(a.x, a.y);
        const [bx, by] = toScreen(b.x, b.y);
        ctx.strokeStyle = webColor(kind);
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const body of bodies) {
        const [x, y] = toScreen(body.x, body.y);
        const selected = body.id === selectedRef.current;
        ctx.fillStyle = selected ? '#e0a13a' : ink;
        ctx.globalAlpha = selected ? 1 : 0.8;
        ctx.beginPath();
        ctx.arc(x, y, (NODE_R + Math.min(body.degree, 8) * 0.6) * (selected ? 1.5 : 1) * Math.max(view.k, 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const at = (event: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top] as const;
    };
    const pick = (px: number, py: number) => {
      let best: Body | null = null;
      let bestD = 12 * 12;
      for (const body of bodies) {
        const [x, y] = toScreen(body.x, body.y);
        const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < bestD) {
          best = body;
          bestD = d;
        }
      }
      return best;
    };

    let dragging: Body | null = null;
    let panning = false;
    let moved = false;
    let last = [0, 0] as readonly [number, number];
    const down = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      last = at(event);
      moved = false;
      dragging = pick(...last);
      panning = !dragging;
    };
    const move = (event: PointerEvent) => {
      const [px, py] = at(event);
      if (dragging || panning) {
        if (Math.abs(px - last[0]) + Math.abs(py - last[1]) > 2) moved = true;
        if (dragging) {
          dragging.x += (px - last[0]) / view.k;
          dragging.y += (py - last[1]) / view.k;
          dragging.vx = dragging.vy = 0;
          alpha = Math.max(alpha, 0.3);
        } else {
          view.x += px - last[0];
          view.y += py - last[1];
        }
        last = [px, py];
      } else {
        setHover(pick(px, py)?.title ?? null);
      }
    };
    const up = (event: PointerEvent) => {
      if (dragging && !moved) onSelectRef.current(dragging.id);
      dragging = null;
      panning = false;
      canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      view.k = Math.min(4, Math.max(0.3, view.k * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('wheel', wheel, { passive: false });

    let frame = 0;
    const loop = () => {
      step();
      draw();
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, [nodes, edges]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full cursor-grab touch-none text-ink" aria-label="Graph of related pins" />
      {hover ? <p className="floating pointer-events-none absolute top-2 left-2 max-w-[80%] truncate px-2.5 py-1 text-xs text-ink">{hover}</p> : null}
      {!edges.length ? <p className="absolute inset-0 grid place-items-center text-sm text-subtle">No related pins in view.</p> : null}
    </div>
  );
}
