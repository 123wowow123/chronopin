'use client';

import { useCallback, useState } from 'react';
import { blobUrl, cardThumbName } from '@/lib/appConfig';

const PROD_BLOB_PREFIX = 'https://chronopin.blob.core.windows.net/thumb/';

// Older media and a failed derivative upload still show the full picture.
// A portrait fallback is contained so its label/face cannot disappear again.
// When running in development without full local Azurite mirrors, falls back
// to Azure Blob Storage and originalUrl so cards never show broken images.
export function CardImage({
  thumbName,
  alt,
  className,
  portrait = false,
  originalUrl,
  priority = false,
}: {
  thumbName?: string | null;
  alt: string;
  className?: string;
  portrait?: boolean;
  originalUrl?: string | null;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);

  const candidates: string[] = [];
  if (thumbName) {
    const card = blobUrl(cardThumbName(thumbName));
    const full = blobUrl(thumbName);
    if (card) candidates.push(card);
    if (full && full !== card) candidates.push(full);

    // If local dev or custom endpoint lacks the blob, fallback to live Azure Blob Storage
    if (!thumbName.startsWith('/') && !/^https?:\/\//i.test(thumbName)) {
      const prodCard = `${PROD_BLOB_PREFIX}${cardThumbName(thumbName)}`;
      const prodFull = `${PROD_BLOB_PREFIX}${thumbName}`;
      if (!candidates.includes(prodCard)) candidates.push(prodCard);
      if (!candidates.includes(prodFull)) candidates.push(prodFull);
    }
  }

  // Fallback to source photography if provided and not a video link
  if (originalUrl && !/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)/i.test(originalUrl)) {
    if (!candidates.includes(originalUrl)) candidates.push(originalUrl);
  }

  const src = candidates.find((url) => !failed.includes(url));
  const markFailed = useCallback(() => {
    if (src) setFailed((current) => (current.includes(src) ? current : [...current, src]));
  }, [src]);
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth === 0) markFailed();
    },
    [markFailed],
  );
  if (!src) return <span aria-hidden="true">✳</span>;

  const isFullOrOriginal = !src.includes('/card/v1/');

  return (
    // eslint-disable-next-line @next/next/no-img-element -- prepared renditions live in Azure
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      width={960}
      height={600}
      className={className}
      ref={ref}
      onError={markFailed}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...(isFullOrOriginal && portrait ? { objectFit: 'contain' } : {}),
      }}
    />
  );
}
