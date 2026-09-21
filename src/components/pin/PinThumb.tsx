'use client';

import { useState } from 'react';
import { blobUrl } from '@/lib/appConfig';
import type { MediumJson } from '@/lib/types';

// The medium a pin shows in a list: a video's still first, as the pin's media
// frame shows it first, else the earliest-attached one. originalUrl is only a
// fallback for images (a video's is the page, not a picture). Mirrors
// PinView.pictures' SQL for the pins whose media arrive whole.
export function pinPicture(media: Pick<MediumJson, 'type' | 'thumbName' | 'originalUrl'>[] | undefined) {
  const medium = media?.find((m) => String(m.type) === '3') ?? media?.[0];
  return { thumbName: medium?.thumbName, originalUrl: medium && String(medium.type) === '1' ? medium.originalUrl : undefined };
}

// A pin's small picture in a list: its thumb, then an image's original, then a blank tile.
export function PinThumb({ thumbName, originalUrl, className = 'h-9 w-16' }: { thumbName?: string | null; originalUrl?: string | null; className?: string }) {
  const sources = [blobUrl(thumbName), originalUrl].filter((src): src is string => !!src);
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  return (
    <span className={`block shrink-0 overflow-hidden rounded bg-raised-2 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbs from blob storage or arbitrary hosts
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed((n) => n + 1)}
        />
      ) : null}
    </span>
  );
}
