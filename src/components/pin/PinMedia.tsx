'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { safeEmbedHtml } from '@/lib/sanitize';
import type { MediumJson } from '@/lib/types';

// A video this component can play, as opposed to one it can only picture.
export function isVideo(medium: MediumJson): boolean {
  return String(medium.type) === '3' && !!medium.html;
}

// One of a pin's media: its image thumbnail (falling back to the original
// when the thumb is missing), a tweet, or a YouTube player. With `poster` a
// video shows its stored still instead of loading the player.
export function PinMedia({
  medium,
  title,
  href,
  external,
  priority,
  sizes,
  poster,
  onMissing,
}: {
  medium: MediumJson;
  title: string;
  href?: string;
  external?: boolean;
  priority?: boolean;
  sizes: string;
  poster?: boolean;
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
  if (isVideo(medium)) {
    if (poster) {
      return <VideoPoster medium={medium} title={title} href={href} external={external} priority={priority} sizes={sizes} onMissing={onMissing} />;
    }
    return <YouTubeEmbed html={medium.html!} title={title} />;
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

// A video as the still stored with it, under a play badge, so a card can show
// what the video is without pulling the player in. The still is the only
// picture a video medium has - its originalUrl is the video - so a video saved
// without one simply drops out of the frame.
function VideoPoster({ medium, ...shared }: Omit<Parameters<typeof ImageMedium>[0], 'medium'> & { medium: MediumJson }) {
  if (!medium.thumbName) {
    return <ImageMedium {...shared} medium={{ ...medium, originalUrl: undefined }} />;
  }
  return (
    <div className="relative">
      <ImageMedium {...shared} medium={medium} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/40">
          <Icon name="play" className="size-7 translate-x-0.5 fill-current" title="Play on the pin's page" />
        </span>
      </span>
    </div>
  );
}

const MEDIUM_LABEL: Record<string, string> = { '1': 'Image', '2': 'Tweet', '3': 'Video' };

// Videos first, then the rest in the order the pin lists them (sort is stable).
function videosFirst(media: MediumJson[]): MediumJson[] {
  return [...media].sort((a, b) => Number(String(b.type) === '3') - Number(String(a.type) === '3'));
}

// A pin's media with labels (place, company) over them. With `selectable`
// (the pin's own page) dots switch between them when there is more than one;
// without it (a card in the timeline) only the first medium shows. A video
// shows first. Only images take the labels: a video or tweet draws its own
// title and badges where they would go, so when a rendered medium is not an
// image the labels render as plain text (the fallback) above instead - for
// every slide, so switching never adds or removes that row - except under
// `poster`, where a video is a picture like any other and takes the labels
// too. The frame takes the shown medium's height. Media with nothing to show
// drop out; when none are left, the fallback renders alone.
export function PinMediaFrame({
  className,
  overlay,
  fallback,
  media,
  priority,
  selectable,
  poster,
  ...shared
}: Omit<Parameters<typeof PinMedia>[0], 'onMissing' | 'medium'> & {
  media: MediumJson[];
  className: string;
  overlay: React.ReactNode;
  fallback: React.ReactNode;
  selectable?: boolean;
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
  const active = (selectable ? slides.find((slide) => slide.key === activeKey) : undefined) ?? slides[0];
  // Only what can be reached is drawn: every slide when the dots are there, the
  // first one otherwise.
  const shownSlides = selectable ? slides : slides.slice(0, 1);
  const dots = selectable && slides.length > 1;
  // A video showing as its still is a picture: it draws no title or badges of
  // its own, so the labels belong over it.
  const playing = (medium: MediumJson) => isVideo(medium) && !poster;
  const labelled = shownSlides.every((slide) => String(slide.medium.type) === '1' || (!!poster && isVideo(slide.medium)));

  const frame = (
    <div className={className}>
      <div className="relative">
        {labelled ? overlay : null}
        {shownSlides.map(({ medium, key }, i) => {
          const shown = key === active.key;
          // A hidden player is unmounted so it stops; other hidden media stay mounted.
          if (!shown && playing(medium)) {
            return null;
          }
          // With dots to reach, a tall image (letterboxed) or tweet (scrolled) is capped
          // so the dots stay above a card's cut-off.
          const capped = dots && !playing(medium);
          return (
            <div key={key} hidden={!shown} className={capped ? 'max-h-[26rem] overflow-y-auto [&_img]:max-h-[26rem] [&_img]:object-contain' : undefined}>
              <MediaSlide medium={medium} mediumKey={key} priority={priority && i === 0} poster={poster} onMissing={markMissing} {...shared} />
            </div>
          );
        })}
      </div>
      {dots ? (
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
                className="group p-1.5 max-lg:p-2.5"
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

// YouTube iframe API player states.
const YT_PLAYING = 1;
const YT_BUFFERING = 3;

// Stored from the YouTube API's own embedHtml. A playing player pauses once it
// scrolls fully out of view and resumes when it scrolls back; one the viewer
// paused stays paused. Uses the iframe API that enablejsapi=1 turns on: after
// a 'listening' handshake the player posts its state to this window.
function YouTubeEmbed({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    const iframe = container?.querySelector('iframe');
    if (!container || !iframe?.src) return;
    const origin = new URL(iframe.src).origin;
    const send = (message: object) => iframe.contentWindow?.postMessage(JSON.stringify(message), origin);
    let state: number | undefined;
    let pausedOffscreen = false;

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data);
        const next = data.event === 'onStateChange' ? data.info : data.info?.playerState;
        if (typeof next === 'number') state = next;
      } catch {
        // Not a player message.
      }
    };
    window.addEventListener('message', onMessage);

    // The player ignores the handshake until it is ready, so repeat it until
    // it first reports a state (for ~10s after the effect or the frame's load).
    let handshake: number | undefined;
    const startHandshake = () => {
      window.clearInterval(handshake);
      state = undefined;
      let tries = 0;
      handshake = window.setInterval(() => {
        if (state !== undefined || ++tries > 40) window.clearInterval(handshake);
        else send({ event: 'listening' });
      }, 250);
    };
    startHandshake();
    iframe.addEventListener('load', startHandshake);

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && (state === YT_PLAYING || state === YT_BUFFERING)) {
        send({ event: 'command', func: 'pauseVideo', args: [] });
        pausedOffscreen = true;
      } else if (entry.isIntersecting && pausedOffscreen) {
        send({ event: 'command', func: 'playVideo', args: [] });
        pausedOffscreen = false;
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      window.clearInterval(handshake);
      iframe.removeEventListener('load', startHandshake);
      window.removeEventListener('message', onMessage);
    };
  }, [html]);
  return <div ref={ref} className="embed-container" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(html, `YouTube video: ${title}`) }} />;
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
