'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/ui/Link';
import { useMusicPlayer } from './MusicPlayerContext';
import { type MusicRankingEntry } from '@/lib/music';
import { pinPath } from '@/lib/seo';

interface Props {
  entry?: MusicRankingEntry;
  adjacent?: {
    previous: MusicRankingEntry;
    next: MusicRankingEntry;
  };
  variant?: 'header' | 'card';
  autoplay?: boolean;
}

export function MusicPinNav({ entry, adjacent, variant = 'header', autoplay }: Props) {
  const router = useRouter();
  const { pause, togglePlay, currentTrack, isPlaying: isAudioPlaying, continuePlaying, setContinuePlaying } = useMusicPlayer();
  const continuePlayingRef = useRef(continuePlaying);
  const [isVideoPlaying, setIsVideoPlaying] = useState(Boolean(autoplay));

  useEffect(() => {
    continuePlayingRef.current = continuePlaying;
  }, [continuePlaying]);

  // Silence any background preview audio when autoplaying a full song pin
  useEffect(() => {
    if (autoplay) {
      pause();
    }
  }, [autoplay, pause]);

  // Synchronize playback state with the YouTube player on the page
  useEffect(() => {
    const handleVideoState = (e: Event) => {
      const customEvent = e as CustomEvent<{ state: number; isPlaying: boolean }>;
      if (typeof customEvent.detail?.isPlaying === 'boolean') {
        setIsVideoPlaying(customEvent.detail.isPlaying);
      }
    };

    const handleWindowMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data || typeof data !== 'object') return;
        const next = data.event === 'onStateChange'
          ? data.info
          : (data.info?.playerState ?? data.info?.state);

        if (typeof next === 'number') {
          if (next === 1 || next === 3) {
            setIsVideoPlaying(true);
          } else if (next === 2 || next === 0 || next === -1) {
            setIsVideoPlaying(false);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('chronopin:video-state-change', handleVideoState);
    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('chronopin:video-state-change', handleVideoState);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // When video begins playing, ensure background audio preview stops
  useEffect(() => {
    if (isVideoPlaying) {
      pause();
    }
  }, [isVideoPlaying, pause]);

  const isPlaying = Boolean(entry && currentTrack?.id === entry.id && isAudioPlaying);

  const nextUrl = adjacent?.next?.pinId
    ? `${pinPath({ id: adjacent.next.pinId, title: adjacent.next.title })}?autoplay=1`
    : null;

  // The Play button always drives the 30s preview in the player dock; the full-song video has its own controls.
  const handlePlayToggle = () => {
    if (!entry) return;
    if (isVideoPlaying) {
      setIsVideoPlaying(false);
      window.dispatchEvent(new CustomEvent('chronopin:pause-video'));
      document.querySelectorAll('iframe').forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } catch {
          // ignore
        }
      });
    }
    togglePlay(entry);
  };

  const stopAllCurrentPlayback = useCallback(() => {
    // 1. Immediately pause background preview audio
    pause();

    // 2. Broadcast stop event for any listening media players
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chronopin:stop-all-playback'));
    }

    // 3. Directly target and blank all video iframes on the current page
    if (typeof document !== 'undefined') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), '*');
        } catch {
          // ignore
        }
        try {
          if (iframe.src && /youtube(-nocookie)?\.com/.test(iframe.src)) {
            iframe.src = 'about:blank';
          }
        } catch {
          // ignore
        }
      });
    }
  }, [pause]);

  // When full song media (e.g. YouTube video) ends, auto-advance if continuePlaying is active
  useEffect(() => {
    if (variant !== 'card') return;

    let navigating = false;
    const handleMediaEnded = () => {
      if (continuePlayingRef.current && nextUrl && !navigating) {
        navigating = true;
        stopAllCurrentPlayback();
        router.push(nextUrl);
      }
    };

    window.addEventListener('chronopin:media-ended', handleMediaEnded);
    return () => {
      window.removeEventListener('chronopin:media-ended', handleMediaEnded);
    };
  }, [nextUrl, router, variant, stopAllCurrentPlayback]);

  if (!adjacent && !entry) return null;

  const previous = adjacent?.previous;
  const next = adjacent?.next;

  const handleNavClick = () => {
    // Immediately stop background preview audio and kill active video players before navigation
    stopAllCurrentPlayback();
  };

  if (variant === 'header') {
    return (
      <>
        {previous?.pinId ? (
          <Link
            href={`${pinPath({ id: previous.pinId, title: previous.title })}?autoplay=1`}
            onClick={handleNavClick}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60"
            title={`Previous song: ${previous.title} by ${previous.artist}`}
          >
            <span aria-hidden="true">⏮</span>
            <span>Prev Song</span>
          </Link>
        ) : null}
        {next?.pinId ? (
          <Link
            href={`${pinPath({ id: next.pinId, title: next.title })}?autoplay=1`}
            onClick={handleNavClick}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60"
            title={`Next song: ${next.title} by ${next.artist}`}
          >
            <span>Next Song</span>
            <span aria-hidden="true">⏭</span>
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePlayToggle}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
        title={isPlaying ? 'Pause song' : 'Play song'}
        aria-label={isPlaying ? 'Pause song' : 'Play song'}
      >
        {isPlaying ? (
          <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="size-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>

      {previous?.pinId ? (
        <Link
          href={`${pinPath({ id: previous.pinId, title: previous.title })}?autoplay=1`}
          onClick={handleNavClick}
          className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline"
          title={`Previous song: ${previous.title} by ${previous.artist}`}
        >
          <span aria-hidden="true">⏮</span>
          <span>Previous Song</span>
        </Link>
      ) : null}
      {next?.pinId ? (
        <Link
          href={`${pinPath({ id: next.pinId, title: next.title })}?autoplay=1`}
          onClick={handleNavClick}
          className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline"
          title={`Next song: ${next.title} by ${next.artist}`}
        >
          <span>Next Song</span>
          <span aria-hidden="true">⏭</span>
        </Link>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={continuePlaying}
        onClick={() => setContinuePlaying((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink cursor-pointer select-none"
        title="Automatically play the next song when this song finishes"
      >
        <span
          aria-hidden="true"
          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
            continuePlaying ? 'bg-accent' : 'bg-line dark:bg-raised-2'
          }`}
        >
          <span
            className={`inline-block size-3 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
              continuePlaying ? 'translate-x-3 rtl:-translate-x-3' : 'translate-x-0'
            }`}
          />
        </span>
        <span className={continuePlaying ? 'text-ink' : 'text-muted'}>Continue to play when ended</span>
      </button>
    </div>
  );
}

