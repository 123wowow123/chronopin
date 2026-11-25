'use client';

// A "To timeline" click names the pin it wants shown. Read once by the
// timeline when it comes back from being hidden, so the pin is scrolled to
// again rather than the old scroll position being put back.
let requested: number | null = null;

export function requestTimelineFocus(pinId: number) {
  requested = pinId;
}

export function takeTimelineFocus(pinId: number): boolean {
  const asked = requested === pinId;
  if (asked) requested = null;
  return asked;
}
