'use client';

import { useState } from 'react';
import { blobUrl } from '@/lib/appConfig';

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
