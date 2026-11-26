import { useEffect, useState } from 'react';

// How often an open page re-reads live numbers.
export const REFRESH_MS = 10 * 60_000;
// Coming back to the tab sooner than this after a read does not read again.
const RETURN_GAP_MS = 60_000;

// A number that goes up when the page should re-read: every REFRESH_MS while
// it is on screen, and on coming back to it. A hidden tab reads nothing.
export function useRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let last = Date.now();
    const due = (gap: number) => {
      if (document.visibilityState !== 'visible' || Date.now() - last < gap) return;
      last = Date.now();
      setTick((n) => n + 1);
    };
    const back = () => due(RETURN_GAP_MS);
    const timer = window.setInterval(() => due(REFRESH_MS), 30_000);
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', back);
      window.removeEventListener('focus', back);
    };
  }, []);
  return tick;
}
