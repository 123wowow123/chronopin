'use client';

import { useCallback, useState } from 'react';
import { blobUrl, cardThumbName } from '@/lib/appConfig';

// Older media and a failed derivative upload still show the full picture.
// A portrait fallback is contained so its label/face cannot disappear again.
export function CardImage({ thumbName, alt, className, portrait = false }: {
  thumbName: string; alt: string; className?: string; portrait?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const full = blobUrl(thumbName)!;
  const card = blobUrl(cardThumbName(thumbName))!;
  const src = [card, full].find((url) => !failed.includes(url));
  const markFailed = useCallback(() => {
    if (src) setFailed((current) => current.includes(src) ? current : [...current, src]);
  }, [src]);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) markFailed();
  }, [markFailed]);
  if (!src) return <span aria-hidden="true">✳</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- prepared renditions live in Azure
    <img src={src} alt={alt} loading="lazy" width={960} height={600} className={className}
      ref={ref} onError={markFailed}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
        ...(src === full && portrait ? { objectFit: 'contain' } : {}) }} />
  );
}
