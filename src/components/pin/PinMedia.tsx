'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const unrenderable = !((type === '2' || type === '3') && medium.html) && type !== '1';
  useEffect(() => {
    if (unrenderable) onMissing?.();
  }, [unrenderable, onMissing]);

  if (type === '2' && medium.html) {
    return <TweetEmbed html={medium.html} />;
  }
  if (type === '3' && medium.html) {
    // Stored from the YouTube API's own embedHtml.
    return <div className="embed-container" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(medium.html) }} />;
  }
  if (unrenderable) {
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
  // No thumbnail and no original that loads: nothing to show.
  const missing = failed || (useOriginal && !medium.originalUrl);
  useEffect(() => {
    if (missing) onMissing?.();
  }, [missing, onMissing]);

  // A server-rendered image can fail before hydration attaches onError; a
  // finished image with no pixels failed.
  const imgRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth === 0) {
        if (useOriginal) setFailed(true);
        else setUseOriginal(true);
      }
    },
    [useOriginal],
  );

  if (missing) {
    return null;
  }

  const image = useOriginal ? (
    // eslint-disable-next-line @next/next/no-img-element -- an original on an arbitrary host
    <img
      ref={imgRef}
      src={medium.originalUrl}
      alt={title}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      className="block h-auto w-full"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <Image
      ref={imgRef}
      src={blobUrl(medium.thumbName)!}
      alt={title}
      width={width}
      height={height}
      sizes={sizes}
      // priority is deprecated in Next 16; eager + high fetch priority is its replacement.
      loading={priority ? 'eager' : undefined}
      fetchPriority={priority ? 'high' : undefined}
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

// A pin's medium with labels (place, company) over it. Only images take the
// labels: a video or tweet draws its own title and badges where they would
// go. When the medium turns out to have nothing to show, the labels would sit
// over whatever follows, so the fallback (the labels as plain text) renders
// instead.
export function PinMediaFrame({
  className,
  overlay,
  fallback,
  ...media
}: Omit<Parameters<typeof PinMedia>[0], 'onMissing'> & {
  className: string;
  overlay: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [missing, setMissing] = useState(false);
  const onMissing = useCallback(() => setMissing(true), []);
  if (missing) {
    return fallback;
  }
  if (String(media.medium.type) !== '1') {
    return (
      <>
        {fallback}
        <div className={className}>
          <PinMedia {...media} onMissing={onMissing} />
        </div>
      </>
    );
  }
  return (
    <div className={className}>
      {overlay}
      <PinMedia {...media} onMissing={onMissing} />
    </div>
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
