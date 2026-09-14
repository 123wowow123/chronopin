'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { blobUrl } from '@/lib/appConfig';
import { safeEmbedHtml } from '@/lib/sanitize';
import type { MediumJson } from '@/lib/types';

// A pin's first medium: its image thumbnail (falling back to the original
// when the thumb is missing), a tweet, or a YouTube player.
export function PinMedia({
  medium,
  title,
  href,
  external,
  priority,
  sizes,
  onMissing,
}: {
  medium: MediumJson;
  title: string;
  href?: string;
  external?: boolean;
  priority?: boolean;
  sizes: string;
  onMissing?: () => void;
}) {
  const type = String(medium.type);
  if (type === '2' && medium.html) {
    return <TweetEmbed html={medium.html} />;
  }
  if (type === '3' && medium.html) {
    // Stored from the YouTube API's own embedHtml.
    return <div className="embed-container" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(medium.html) }} />;
  }
  if (type !== '1') {
    return null;
  }
  return (
    <ImageMedium medium={medium} title={title} href={href} external={external} priority={priority} sizes={sizes} onMissing={onMissing} />
  );
}

function ImageMedium({
  medium,
  title,
  href,
  external,
  priority,
  sizes,
  onMissing,
}: {
  medium: MediumJson;
  title: string;
  href?: string;
  external?: boolean;
  priority?: boolean;
  sizes: string;
  onMissing?: () => void;
}) {
  const [useOriginal, setUseOriginal] = useState(!medium.thumbName);
  const [failed, setFailed] = useState(false);
  const width = medium.thumbWidth || medium.originalWidth || 1000;
  const height = medium.thumbHeight || medium.originalHeight || 562;

  if (failed || (useOriginal && !medium.originalUrl)) {
    return null;
  }

  const image = useOriginal ? (
    // eslint-disable-next-line @next/next/no-img-element -- an original on an arbitrary host
    <img
      src={medium.originalUrl}
      alt={title}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      className="block h-auto w-full"
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true);
        onMissing?.();
      }}
    />
  ) : (
    <Image
      src={blobUrl(medium.thumbName)!}
      alt={title}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className="block h-auto w-full"
      onError={() => setUseOriginal(true)}
    />
  );

  if (!href) {
    return image;
  }
  return external ? (
    <a href={href} target="_blank" rel="noopener" className="block">
      {image}
    </a>
  ) : (
    <Link href={href} className="block">
      {image}
    </Link>
  );
}

// Twitter's widgets script turns the stored blockquote into the full tweet.
function TweetEmbed({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const w = window as unknown as { twttr?: { widgets: { load: (el?: HTMLElement) => void } } };
    const render = () => w.twttr?.widgets.load(ref.current ?? undefined);
    if (w.twttr) {
      render();
      return;
    }
    let script = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', render);
    return () => script?.removeEventListener('load', render);
  }, [html]);
  return <div ref={ref} className="flex justify-center px-2" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(html) }} />;
}
