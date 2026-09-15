'use client';

import { useEffect } from 'react';

// Counts this visit toward the pin's views. The page HTML is cached and shared,
// so the count is sent from the browser; the server keeps one per viewer a day.
export function PinViewTracker({ pinId }: { pinId: number }) {
  useEffect(() => {
    fetch(`/api/pins/${pinId}/view`, { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(() => {});
  }, [pinId]);
  return null;
}
