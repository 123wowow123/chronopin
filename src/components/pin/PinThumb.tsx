'use client';

import { useCallback, useState } from 'react';
import { blobUrl, smallThumbName } from '@/lib/appConfig';
import type { MediumJson } from '@/lib/types';

// The medium a pin shows in a list: a video's still first, as the pin's media
// frame shows it first, else the earliest-attached one. Mirrors
// PinView.pictures' SQL for the pins whose media arrive whole.
export function pinPicture(media: Pick<MediumJson, 'type' | 'thumbName'>[] | undefined) {
  const medium = media?.find((m) => String(m.type) === '3') ?? media?.[0];
  return { thumbName: medium?.thumbName };
}

// A hue for a pin with no picture, from its category when it has one (so a
// category's pins share a colour down a list) or else its title.
function hueOf(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return Math.abs(hash) % 360;
}

// A pin's small picture in a list: its small thumb (160x108, a few KB, made
// when the thumb is saved), else a tile tinted by its category with its
// title's first letter or digit.
export function PinThumb({
  thumbName,
  title,
  category,
  className = 'h-9 w-16',
}: {
  thumbName?: string | null;
  title?: string | null;
  category?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed || !thumbName ? undefined : blobUrl(smallThumbName(thumbName));
  // A server-rendered image can fail before hydration attaches onError; a
  // finished image with no pixels failed.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const letter = !src && title ? title.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() : undefined;
  if (letter) {
    // Mixed into the theme's own tile and text colours, so it reads on both.
    const tint = `oklch(0.62 0.13 ${hueOf(category || title!)})`;
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded font-display text-base font-semibold select-none ${className}`}
        style={{
          background: `color-mix(in oklab, ${tint} 28%, var(--color-raised-2))`,
          color: `color-mix(in oklab, ${tint} 65%, var(--color-ink))`,
        }}
      >
        {letter}
      </span>
    );
  }
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded bg-raised-2 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- already sized and cached in blob storage
        <img
          src={src}
          alt=""
          width={160}
          height={108}
          loading="lazy"
          className="size-full object-cover"
          ref={imgRef}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
