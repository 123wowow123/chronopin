'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { blobUrl } from '@/lib/appConfig';
import { safeEmbedHtml } from '@/lib/sanitize';
import type { MediumJson } from '@/lib/types';

// One of a pin's media: its image thumbnail (falling back to the original
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
    return <div className="embed-container" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(medium.html, `YouTube video: ${title}`) }} />;
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

const MEDIUM_LABEL: Record<string, string> = { '1': 'Image', '2': 'Tweet', '3': 'Video' };

// Videos first, then the rest in the order the pin lists them (sort is stable).
function videosFirst(media: MediumJson[]): MediumJson[] {
  return [...media].sort((a, b) => Number(String(b.type) === '3') - Number(String(a.type) === '3'));
}

// A pin's media with labels (place, company) over them, and dots to switch
// between them when there is more than one. A video shows first. Only images
// take the labels: a video or tweet draws its own title and badges where they
// would go, so when any medium is not an image the labels render as plain text
// (the fallback) above instead - for every slide, so switching never adds or
// removes that row. The frame takes the shown medium's height. Media with
// nothing to show drop out; when none are left, the fallback renders alone.
export function PinMediaFrame({
  className,
  overlay,
  fallback,
  media,
  priority,
  ...shared
}: Omit<Parameters<typeof PinMedia>[0], 'onMissing' | 'medium'> & {
  media: MediumJson[];
  className: string;
  overlay: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());
  const markMissing = useCallback((key: string) => setMissing((prev) => (prev.has(key) ? prev : new Set(prev).add(key))), []);
  const [activeKey, setActiveKey] = useState<string>();

  const slides = videosFirst(media)
    .map((medium, i) => ({ medium, key: String(medium.id ?? medium.originalUrl ?? medium.thumbName ?? i) }))
    .filter((slide) => !missing.has(slide.key));
  if (!slides.length) {
    return fallback;
  }
  const active = slides.find((slide) => slide.key === activeKey) ?? slides[0];
  const labelled = slides.every((slide) => String(slide.medium.type) === '1');

  const frame = (
    <div className={className}>
      <div className="relative">
        {labelled ? overlay : null}
        {slides.map(({ medium, key }, i) => {
          const shown = key === active.key;
          // A hidden player is unmounted so it stops; other hidden media stay mounted.
          if (!shown && String(medium.type) === '3' && medium.html) {
            return null;
          }
          // With dots to reach, a tall image (letterboxed) or tweet (scrolled) is capped
          // so the dots stay above a card's cut-off.
          const capped = slides.length > 1 && String(medium.type) !== '3';
          return (
            <div key={key} hidden={!shown} className={capped ? 'max-h-[26rem] overflow-y-auto [&_img]:max-h-[26rem] [&_img]:object-contain' : undefined}>
              <MediaSlide medium={medium} mediumKey={key} priority={priority && i === 0} onMissing={markMissing} {...shared} />
            </div>
          );
        })}
      </div>
      {slides.length > 1 ? (
        <div role="group" aria-label="Media" className="flex justify-center gap-0.5 py-1">
          {slides.map(({ medium, key }, i) => {
            const shown = key === active.key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                aria-label={`${MEDIUM_LABEL[String(medium.type)] ?? 'Medium'} ${i + 1} of ${slides.length}`}
                aria-pressed={shown}
                className="group p-1.5"
              >
                <span className={`block size-2 rounded-full transition-colors ${shown ? 'bg-white' : 'bg-white/40 group-hover:bg-white/70'}`} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
  return labelled ? (
    frame
  ) : (
    <>
      {fallback}
      {frame}
    </>
  );
}

// One medium in the frame, reporting itself missing by key.
function MediaSlide({
  mediumKey,
  onMissing,
  ...media
}: Omit<Parameters<typeof PinMedia>[0], 'onMissing'> & { mediumKey: string; onMissing: (key: string) => void }) {
  const onSlideMissing = useCallback(() => onMissing(mediumKey), [onMissing, mediumKey]);
  return <PinMedia {...media} onMissing={onSlideMissing} />;
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
