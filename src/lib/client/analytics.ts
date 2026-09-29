'use client';

// A Google Analytics event. gtag only exists on the real site (the inline
// script in src/lib/analytics.ts adds it nowhere else), so anywhere else this
// sends nothing. An event's own parameters show in reports once registered as
// custom dimensions in Analytics (Admin > Custom definitions).
export function trackEvent(name: string, params: Record<string, string | number | boolean>) {
  const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', name, params);
}
