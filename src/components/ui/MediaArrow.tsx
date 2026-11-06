'use client';

import { Icon } from './Icon';

// The previous or next arrow beside the dots, for a mouse: it shows while the
// pointer is over the media (or the arrow has keyboard focus). A touch screen
// has no hover and swipes instead, so there it is not drawn at all.
export function MediaArrow({ side, label, onStep }: { side: 'previous' | 'next'; label: string; onStep: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onStep}
      className="hidden rounded-full p-1 text-white/70 opacity-0 transition group-hover/media:opacity-100 hover:bg-white/15 hover:text-white focus-visible:opacity-100 active:scale-90 active:bg-white/25 pointer-fine:flex"
    >
      <Icon name="chevron" className={`size-4 ${side === 'previous' ? 'rotate-90' : '-rotate-90'}`} />
    </button>
  );
}

