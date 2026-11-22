'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { PREPARED_WIDTHS, preparedSources } from '@/lib/preparedImage';

const FILL: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

// A stored restaurant/landing photo from its Azure renditions
// (src/lib/preparedImage.ts). Anything without renditions, or whose
// rendition fails to load (not made yet), renders through next/image as before.
export function PreparedImage({ src, alt, sizes, className, fill = false, width, height, draggable, widths = PREPARED_WIDTHS }: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  draggable?: boolean;
  widths?: readonly number[];
}) {
  const [failed, setFailed] = useState(false);
  const prepared = failed ? null : preparedSources(src, widths);
  const markFailed = useCallback(() => setFailed(true), []);
  // An error before hydration never reaches onError.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) markFailed();
  }, [markFailed]);
  if (!prepared) {
    return fill
      ? <Image src={src} alt={alt} fill sizes={sizes} className={className} draggable={draggable} />
      : <Image src={src} alt={alt} width={width!} height={height!} sizes={sizes} className={className} draggable={draggable} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- prepared renditions live in Azure
    <img
      ref={ref}
      src={prepared.src}
      srcSet={prepared.srcSet}
      sizes={sizes}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading="lazy"
      decoding="async"
      draggable={draggable}
      className={className}
      style={fill ? FILL : undefined}
      onError={markFailed}
    />
  );
}
