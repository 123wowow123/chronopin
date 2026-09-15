'use client';

import { useState } from 'react';
import { blobUrl } from '@/lib/appConfig';

// A user's picture in a circle, or the first letter of their handle when they
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
  const initial = (userName || '').replace('@', '').charAt(0).toUpperCase();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised-2 font-semibold text-ink ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny avatars from arbitrary hosts
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(pictureUrl!)} />
      ) : (
        initial
      )}
    </span>
  );
}
