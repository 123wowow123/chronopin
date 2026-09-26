'use client';

import Image from 'next/image';
import Link from '@/components/ui/Link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { safeEmbedHtml } from '@/lib/sanitize';
import type { MediumJson } from '@/lib/types';
import { mediumEmbedHtml } from '@/lib/videoEmbed';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';

// A video this component can play, as opposed to one it can only picture:
// one with a stored player, or a YouTube URL to build one from.
export function isVideo(medium: MediumJson): boolean {
  return String(medium.type) === '3' && !!mediumEmbedHtml(medium);
}

// Whether PinMedia has anything to draw for a medium, from its fields alone: a
// tweet or player needs its html, a video's still its thumb, a picture a thumb
// or an original. Only a load failure is left to find out in the browser.
function drawable(medium: MediumJson, poster?: boolean): boolean {
  const type = String(medium.type);
  if (type === '2') return !!medium.html;
  if (type === '3') return isVideo(medium) && (!poster || !!medium.thumbName);
  return type === '1' && !!(medium.thumbName || medium.originalUrl);
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
  const unrenderable = !((type === '2' && medium.html) || isVideo(medium)) && type !== '1';
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
    return <YouTubeEmbed html={mediumEmbedHtml(medium)!} title={title} />;
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
  const t = useT();
  if (!medium.thumbName) {
    return <ImageMedium {...shared} medium={{ ...medium, originalUrl: undefined }} />;
  }
  return (
    <div className="relative">
      <ImageMedium {...shared} medium={medium} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/40">
          <Icon name="play" className="size-7 translate-x-0.5 fill-current" title={t('media.playOnPage')} />
        </span>
      </span>
    </div>
  );
}

const MEDIUM_LABEL: Record<string, MessageKey> = { '1': 'media.image', '2': 'media.tweet', '3': 'media.video' };

// Videos first, then the rest in the order the pin lists them (sort is stable).
function videosFirst(media: MediumJson[]): MediumJson[] {
  return [...media].sort((a, b) => Number(String(b.type) === '3') - Number(String(a.type) === '3'));
}

// How far a finger must travel sideways to move to the next medium.
const SWIPE_PX = 50;

// A pin's media with labels (place, company) over them. With `selectable`
// (the pin's own page) dots, or a swipe (finger, mouse drag or trackpad), switch between them when
// there is more than one;
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
  const t = useT();
  // A finger's (or mouse's) swipe across the media, while it lasts (see
  // swipeHandlers), and whether the last one moved sideways, so the click
  // that ends a mouse drag does not also follow the picture's link.
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; horizontal?: boolean } | null>(null);
  const swiped = useRef(false);
  const [dragX, setDragX] = useState(0);
  // A trackpad's sideways swipe arrives as wheel events: their deltaX adds up
  // until it passes SWIPE_PX, then the rest of that gesture (its momentum
  // included) is ignored until the events pause.
  const frameRef = useRef<HTMLDivElement>(null);
  const wheel = useRef({ dx: 0, locked: false, timer: 0 });

  // Media with nothing to draw are left out here rather than reported missing
  // by an effect: the server would draw an empty frame (and the place row a
  // missing picture puts above it), and the card would grow by a picture once
  // the browser hydrated and moved on to the next medium.
  const slides = videosFirst(media)
    .map((medium, i) => ({ medium, key: String(medium.id ?? medium.originalUrl ?? medium.thumbName ?? i) }))
    .filter((slide) => drawable(slide.medium, poster) && !missing.has(slide.key));
  const active = (selectable ? slides.find((slide) => slide.key === activeKey) : undefined) ?? slides[0];
  // Only what can be reached is drawn: every slide when the dots are there, the
  // first one otherwise.
  const shownSlides = selectable ? slides : slides.slice(0, 1);
  const dots = selectable && slides.length > 1;
  const activeIndex = slides.indexOf(active);
  // Past either end it loops round to the other.
  const step = (dir: number) => setActiveKey(slides[(activeIndex + dir + slides.length) % slides.length].key);

  // React's onWheel is passive, and a sideways trackpad swipe must be kept
  // from scrolling or going back a page, so the listener is the DOM's own.
  // A mostly vertical wheel is left to the page's scroll.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const w = wheel.current;
      window.clearTimeout(w.timer);
      w.timer = window.setTimeout(() => {
        w.dx = 0;
        w.locked = false;
      }, 200);
      if (w.locked) return;
      w.dx += e.deltaX;
      if (Math.abs(w.dx) > SWIPE_PX) {
        w.locked = true;
        step(Math.sign(w.dx));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  if (!slides.length) {
    return fallback;
  }

  // With dots, a finger, pen or mouse drag swipes between media too: the shown
  // one follows it sideways, and a drag past SWIPE_PX moves to the next or the
  // previous, looping round at either end. A mostly vertical drag is left to
  // the page's scroll. A playing video's own touches stay inside its frame.
  // A finger is followed through touch events rather than pointer events: iOS
  // can end a sideways touch without a pointerup, which left the picture
  // following the finger but never moving on. A swipe the browser cancels
  // still counts by how far it had gone.
  const startSwipe = (id: number, x: number, y: number) => {
    swiped.current = false;
    swipe.current = { id, x, y, dx: 0 };
  };
  // Whether the swipe is (now) a sideways one.
  const moveSwipe = (id: number, x: number, y: number): boolean => {
    const s = swipe.current;
    if (!s || s.id !== id) return false;
    const dx = x - s.x;
    const dy = y - s.y;
    if (s.horizontal === undefined) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!s.horizontal) {
        swipe.current = null;
        return false;
      }
    }
    s.dx = dx;
    setDragX(dx);
    return true;
  };
  const endSwipe = (id?: number) => {
    const s = swipe.current;
    if (!s || (id !== undefined && s.id !== id)) return;
    swipe.current = null;
    setDragX(0);
    if (!s.horizontal) return;
    swiped.current = true;
    if (Math.abs(s.dx) > SWIPE_PX) step(s.dx < 0 ? 1 : -1);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!e.touches.length) endSwipe();
  };
  const swipeHandlers = dots
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          // A second finger is a pinch, not a swipe.
          if (e.touches.length === 1) startSwipe(-1, e.touches[0].clientX, e.touches[0].clientY);
          else swipe.current = null;
        },
        onTouchMove: (e: React.TouchEvent) => {
          if (e.touches.length === 1) moveSwipe(-1, e.touches[0].clientX, e.touches[0].clientY);
        },
        onTouchEnd,
        onTouchCancel: onTouchEnd,
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
          startSwipe(e.pointerId, e.clientX, e.clientY);
        },
        onPointerMove: (e: React.PointerEvent) => {
          const sideways = moveSwipe(e.pointerId, e.clientX, e.clientY);
          // A mouse keeps dragging once it leaves the frame.
          if (sideways && e.pointerType === 'mouse' && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerUp: (e: React.PointerEvent) => endSwipe(e.pointerId),
        onPointerCancel: (e: React.PointerEvent) => endSwipe(e.pointerId),
        onClickCapture: (e: React.MouseEvent) => {
          if (!swiped.current) return;
          swiped.current = false;
          e.preventDefault();
          e.stopPropagation();
        },
        // A mouse would otherwise pick the picture up as a native drag.
        onDragStart: (e: React.DragEvent) => e.preventDefault(),
      }
    : {};
  // A video showing as its still is a picture: it draws no title or badges of
  // its own, so the labels belong over it.
  const playing = (medium: MediumJson) => isVideo(medium) && !poster;
  const labelled = shownSlides.every((slide) => String(slide.medium.type) === '1' || (!!poster && isVideo(slide.medium)));

  const frame = (
    <div className={`group/media ${className}`}>
      {/* touch-action keeps vertical scroll and pinch with the browser and
          hands sideways drags to the swipe - on each slide too, since a capped
          slide scrolls and so starts its own touch-action chain.
          overflow-x-clip keeps a dragged slide from widening the page. */}
      <div ref={dots ? frameRef : undefined} className={dots ? 'relative touch-pan-y touch-pinch-zoom overflow-x-clip select-none' : 'relative'} {...swipeHandlers}>
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
            <div
              key={key}
              hidden={!shown}
              className={[capped ? 'max-h-[26rem] overflow-y-auto [&_img]:max-h-[26rem] [&_img]:object-contain' : '', dots ? 'touch-pan-y touch-pinch-zoom' : '', dots && !dragX ? 'transition-transform duration-200' : '']
                .filter(Boolean)
                .join(' ') || undefined}
              style={shown && dragX ? { transform: `translateX(${dragX}px)` } : undefined}
            >
              <MediaSlide medium={medium} mediumKey={key} priority={priority && i === 0} poster={poster} onMissing={markMissing} {...shared} />
            </div>
          );
        })}
        {/* A strip at each edge steps to the previous or next medium when
            clicked, rather than the picture's link opening, and takes a swipe
            that starts on it - over a player too, which otherwise keeps every
            touch and click inside its iframe. They stop short of the player's
            top and bottom bars and of the labels in the frame's corners. */}
        {dots ? (
          <>
            <MediaEdge side="previous" onStep={() => step(-1)} />
            <MediaEdge side="next" onStep={() => step(1)} />
          </>
        ) : null}
      </div>
      {dots ? (
        <div role="group" aria-label={t('media.label')} className="flex items-center justify-center gap-0.5 py-1">
          <MediaArrow side="previous" label={t('media.previous')} onStep={() => step(-1)} />
          {slides.map(({ medium, key }, i) => {
            const shown = key === active.key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                aria-label={t('media.nOfTotal', { kind: t(MEDIUM_LABEL[String(medium.type)] ?? 'media.medium'), n: i + 1, total: slides.length })}
                aria-pressed={shown}
                className="group p-1.5 max-lg:p-2.5"
              >
                <span className={`block size-2 rounded-full transition-colors ${shown ? 'bg-white' : 'bg-white/40 group-hover:bg-white/70'}`} />
              </button>
            );
          })}
          <MediaArrow side="next" label={t('media.next')} onStep={() => step(1)} />
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

// An edge of the frame that steps to the previous or next medium when clicked,
// and passes a swipe that starts on it up to the frame. It darkens under a
// hovering pointer and more while pressed. The arrows beside the dots are the
// labelled buttons, so this one stays out of the tab order and the a11y tree.
function MediaEdge({ side, onStep }: { side: 'previous' | 'next'; onStep: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onStep}
      className={`absolute inset-y-12 z-10 w-12 touch-pan-y touch-pinch-zoom from-black/0 transition-colors hover:from-black/30 active:from-black/45 ${side === 'previous' ? 'left-0 bg-linear-to-r' : 'right-0 bg-linear-to-l'}`}
    />
  );
}

// The previous or next arrow beside the dots, for a mouse: it shows while the
// pointer is over the media (or the arrow has keyboard focus). A touch screen
// has no hover and swipes instead, so there it is not drawn at all.
function MediaArrow({ side, label, onStep }: { side: 'previous' | 'next'; label: string; onStep: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onStep}
      className="hidden rounded-full p-1 text-white/70 opacity-0 transition group-hover/media:opacity-100 hover:bg-white/15 hover:text-white focus-visible:opacity-100 active:scale-90 active:bg-white/25 pointer-fine:block"
    >
      <Icon name="chevron" className={`size-4 ${side === 'previous' ? 'rotate-90' : '-rotate-90'}`} />
    </button>
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
// Leaving the page pauses it too: the router keeps up to three pages in the
// document, hidden, so that going back restores them (React's <Activity>).
// A hidden page's iframe is still there and still playing - its effects are
// the only thing torn down - so the player is paused on the way out. Coming
// back it stays paused, where the viewer left off.
function YouTubeEmbed({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const container = ref.current;
    const iframe = container?.querySelector('iframe');
    if (!container || !iframe?.src) return;
    const origin = new URL(iframe.src).origin;
    const send = (message: object) => iframe.contentWindow?.postMessage(JSON.stringify(message), origin);
    let state: number | undefined;
    let pausedOffscreen = false;
    const playing = () => state === YT_PLAYING || state === YT_BUFFERING;

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
      if (!entry.isIntersecting && playing()) {
        send({ event: 'command', func: 'pauseVideo', args: [] });
        pausedOffscreen = true;
      } else if (entry.isIntersecting && pausedOffscreen) {
        send({ event: 'command', func: 'playVideo', args: [] });
        pausedOffscreen = false;
      }
    });
    observer.observe(container);
    return () => {
      if (playing()) send({ event: 'command', func: 'pauseVideo', args: [] });
      observer.disconnect();
      window.clearInterval(handshake);
      iframe.removeEventListener('load', startHandshake);
      window.removeEventListener('message', onMessage);
    };
  }, [html]);
  return <div ref={ref} className="embed-container" dangerouslySetInnerHTML={{ __html: safeEmbedHtml(html, t('media.youtubeTitle', { title })) }} />;
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
