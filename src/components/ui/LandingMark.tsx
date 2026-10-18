'use client';

import { useLayoutEffect, useRef } from 'react';

// Sits inside a `data-landing` element. A page that has been navigated away from is kept in
// the DOM, hidden (React Activity), so the element alone can't say whether the landing is
// on screen: the header would keep the landing's colors on the next page. Effects are torn
// down while hidden, so the parent is flagged `data-off` then, and the CSS skips it.
export function LandingMark() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const landing = ref.current?.parentElement;
    landing?.removeAttribute('data-off');
    return () => landing?.setAttribute('data-off', '');
  }, []);
  return <span ref={ref} hidden />;
}
