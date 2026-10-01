'use client';

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

const PAGE = 8;

// A pin page's thread, eight rows tall however long it is: the list scrolls
// inside its own box and takes the next eight rows as the end comes into view,
// so a long run (a season-by-season anime, a meeting-by-meeting FOMC chain)
// never stretches the pane. It opens scrolled to the pin being read, with
// enough rows in place to reach it.
export function ThreadList({ items, current }: { items: ReactNode[]; current: number }) {
  const [shown, setShown] = useState(() => Math.min(items.length, Math.max(PAGE, Math.ceil((current + 4) / PAGE) * PAGE)));
  const box = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLLIElement>(null);
  const [height, setHeight] = useState<number>();

  // The box is as tall as its first eight rows, measured again when the width
  // (and so how the titles wrap) changes.
  useLayoutEffect(() => {
    const node = box.current;
    if (!node || items.length <= PAGE) return;
    const measure = () => {
      const rows = node.querySelectorAll<HTMLElement>('[data-thread-row]');
      if (rows.length > PAGE) setHeight(rows[PAGE].offsetTop - rows[0].offsetTop);
      else if (rows.length) setHeight(node.scrollHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length]);

  // Open on the pin being read.
  useEffect(() => {
    const node = box.current;
    const row = node?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!node || !row || items.length <= PAGE) return;
    node.scrollTop = row.offsetTop - node.offsetTop - (node.clientHeight - row.offsetHeight) / 2;
    // Only on arrival: scrolling away must not be undone by a later render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const node = end.current;
    if (!node || shown >= items.length) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setShown((n) => Math.min(items.length, n + PAGE)), {
      root: box.current,
      rootMargin: '120px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, items.length]);

  return (
    <div ref={box} className="mt-3 overflow-y-auto overscroll-contain" style={height ? { maxHeight: height } : undefined}>
      <ol className="space-y-1">
        {items.slice(0, shown).map((item, index) => (
          <li key={index} data-thread-row>
            {item}
          </li>
        ))}
        {shown < items.length ? <li ref={end} aria-hidden className="h-px" /> : null}
      </ol>
    </div>
  );
}
