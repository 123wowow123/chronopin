'use client';

import { useId, useState } from 'react';
import { blobUrl } from '@/lib/appConfig';

// Gradients for generated avatars, light corner to deep corner. The first is
// the one on Ian's uploaded picture; the rest keep its shape in other hues.
const GRADIENTS = [
  ['#fcc849', '#fb7f91', '#c4264c'],
  ['#7dd3fc', '#3b82f6', '#312e81'],
  ['#bef264', '#10b981', '#065f46'],
  ['#f9a8d4', '#c084fc', '#6d28d9'],
  ['#fde68a', '#fb923c', '#b91c1c'],
  ['#67e8f9', '#818cf8', '#7e22ce'],
] as const;

// "@ThePinGang" -> "TG", "@game_desk" -> "GD", "@ui1ba0qd" -> "U": the first
// and last word of the handle, like a first and last name. Words break at
// capitals and punctuation, not digits, so generated handles stay one word.
export function handleInitials(userName: string | null | undefined): string {
  const words = (userName || '').match(/[A-Z]?[a-z\d]+|[A-Z]+(?![a-z])|\d+/g) ?? [];
  const letters = words.map((word) => word[0].toUpperCase());
  return letters.length > 1 ? letters[0] + letters[letters.length - 1] : (letters[0] ?? '');
}

// The same handle always picks the same gradient.
function gradientFor(userName: string): (typeof GRADIENTS)[number] {
  // FNV-1a: a plain times-31 hash modulo six only sees the sum of the letters.
  let hash = 0x811c9dc5;
  for (const char of userName.replace(/^@+/, '').toLowerCase()) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

// Drawn to match an uploaded picture: a diagonal gradient with a soft glow in
// the light corner, two faint circles, and white initials. An SVG, so it is
// sharp at every size an avatar is shown.
function GeneratedAvatar({ userName }: { userName: string }) {
  const id = useId().replace(/[^\w-]/g, '');
  const [from, via, to] = gradientFor(userName);
  const initials = handleInitials(userName);
  return (
    <svg viewBox="0 0 256 256" className="size-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="0.5" stopColor={via} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.2" cy="0.15" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="256" height="256" fill={`url(#${id}-bg)`} />
      <rect width="256" height="256" fill={`url(#${id}-glow)`} />
      <circle cx="215" cy="215" r="78" fill="#fff" fillOpacity="0.08" />
      <circle cx="36" cy="232" r="44" fill="#fff" fillOpacity="0.08" />
      <text
        x="128"
        y="128"
        dy="0.35em"
        textAnchor="middle"
        fill="#fff"
        fontSize={initials.length > 1 ? 104 : 124}
        fontWeight="700"
        style={{ fontFamily: 'inherit' }}
      >
        {initials}
      </text>
    </svg>
  );
}

// A user's picture in a circle, or a generated one from their handle when they
// have none or it fails to load. pictureUrl is either a full URL (a Facebook or
// Google photo) or the blob name of an uploaded picture.
export function UserAvatar({
  userName,
  pictureUrl,
  className = 'size-6 text-xs',
}: {
  userName?: string | null;
  pictureUrl?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const src = pictureUrl && broken !== pictureUrl ? blobUrl(pictureUrl) : undefined;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised-2 font-semibold text-ink ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny avatars from arbitrary hosts
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(pictureUrl!)} />
      ) : (
        <GeneratedAvatar userName={userName || ''} />
      )}
    </span>
  );
}
