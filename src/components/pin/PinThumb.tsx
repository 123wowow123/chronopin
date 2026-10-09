'use client';

import { useCallback, useState } from 'react';
import { blobUrl, smallThumbName } from '@/lib/appConfig';
import type { MediumJson } from '@/lib/types';

// The medium a pin shows in a list: a video's still first, as the pin's media
// frame shows it first, else the earliest-attached one. Mirrors
// PinView.pictures' SQL for the pins whose media arrive whole.
export function pinPicture(media: (Pick<MediumJson, 'type' | 'thumbName'> & Partial<Pick<MediumJson, 'originalUrl'>>)[] | undefined) {
  const medium = media?.find((m) => String(m.type) === '3') ?? media?.[0];
  return { thumbName: medium?.thumbName, originalUrl: String(medium?.type) === '1' ? medium?.originalUrl : undefined };
}

// A hue for a pin with no picture, from its category when it has one (so a
// category's pins share a colour down a list) or else its title.
function hueOf(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return Math.abs(hash) % 360;
}

// A pin's small picture in a list: its small thumb (160x108, a few KB, made
// when the thumb is saved), then the full thumb or original image. Only when
// every image fails does it use a tinted tile with the title's first letter.
export function PinThumb({
  thumbName,
  originalUrl,
  title,
  category,
  className = 'h-9 w-16',
}: {
  thumbName?: string | null;
  originalUrl?: string | null;
  title?: string | null;
  category?: string | null;
  className?: string;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const src = [thumbName ? blobUrl(smallThumbName(thumbName)) : undefined, blobUrl(thumbName), originalUrl]
    .find((candidate) => candidate && !failedSources.includes(candidate));
  // A server-rendered image can fail before hydration attaches onError; a
  // finished image with no pixels failed.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (src && img?.complete && img.naturalWidth === 0) {
      setFailedSources((current) => current.includes(src) ? current : [...current, src]);
    }
  }, [src]);
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
    <span className={`relative block shrink-0 overflow-hidden rounded bg-raised-2 hover:[&_img]:scale-[1.08] motion-reduce:hover:[&_img]:scale-100 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- already sized and cached in blob storage
        <img
          key={src}
          src={src}
          alt=""
          width={160}
          height={108}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover transition-transform duration-[400ms] ease-out [a:hover_&]:scale-[1.08] [button:hover_&]:scale-[1.08] motion-reduce:transition-none motion-reduce:[a:hover_&]:scale-100 motion-reduce:[button:hover_&]:scale-100"
          ref={imgRef}
          onError={() => setFailedSources((current) => current.includes(src) ? current : [...current, src])}
        />
      ) : null}
    </span>
  );
}
