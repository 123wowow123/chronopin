'use client';

import { useMemo, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { useMusicPlayer } from './MusicPlayerContext';
import { pinPath } from '@/lib/seo';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function GlobalMusicPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    nextTrack,
    prevTrack,
    pause,
    seek,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    closePlayer,
    continuePlaying,
    setContinuePlaying,
  } = useMusicPlayer();

  const progressRef = useRef<HTMLDivElement>(null);
  // Mobile: drag the dock down to dismiss it.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const DISMISS_DISTANCE = 70;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - touchStartY.current));
  };
  const onTouchEnd = () => {
    const dismiss = dragY > DISMISS_DISTANCE;
    touchStartY.current = null;
    setDragging(false);
    setDragY(0);
    if (dismiss) closePlayer();
  };
  const locateHash = currentTrack
    ? `#year=${currentTrack.year}&continent=${encodeURIComponent(currentTrack.originContinent ?? currentTrack.continent)}&track=${encodeURIComponent(currentTrack.id.replace(/~t\d+$/, ''))}`
    : '';
  const locateClass =
    'inline-flex size-7 items-center justify-center rounded-full border border-line bg-raised text-link shadow-xs transition-colors hover:bg-raised-2 hover:no-underline cursor-pointer';
  const locateInner = <Icon name="target" className="size-4" />;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio);
  };

  const pinHref = useMemo(() => {
    if (!currentTrack) return '';
    return currentTrack.pinId
      ? pinPath({ id: currentTrack.pinId, title: currentTrack.title })
      : currentTrack.sourceUrl;
  }, [currentTrack]);

  if (!currentTrack) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl flex flex-col items-center">
      {/* Main Bottom Dock */}
      <aside
        role="region"
        aria-label="Audio player dock"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          opacity: dragY ? Math.max(0.4, 1 - dragY / 200) : undefined,
          transition: dragging ? 'none' : undefined,
        }}
        className="w-full rounded-2xl border border-line bg-popover/98 px-4 py-3 text-ink shadow-[0_12px_40px_rgb(0_0_0/0.45)] ring-1 ring-white/10 dark:ring-white/10 backdrop-blur-xl transition-all duration-300 ease-out sm:px-6"
      >
        {/* Mobile swipe-down handle */}
        <div aria-hidden="true" className="-mt-1.5 mb-1.5 flex justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-faint/60" />
        </div>
        <div className="flex flex-col gap-2.5 sm:gap-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Artwork, Track Title & Artist */}
            <div className="flex min-w-0 items-center gap-3">
              {pinHref ? (
                <Link
                  href={pinHref}
                  className="group relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-raised shadow-xs block hover:opacity-95 transition-opacity"
                  title={`View pin detail for ${currentTrack.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external audio artwork */}
                  <img
                    src={currentTrack.artworkUrl || undefined}
                    alt={`${currentTrack.title} artwork`}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {isPlaying ? (
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }} />
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '40%', animationDuration: '0.5s' }} />
                      </span>
                    </span>
                  ) : null}
                </Link>
              ) : (
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-raised shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external audio artwork */}
                  <img
                    src={currentTrack.artworkUrl || undefined}
                    alt={`${currentTrack.title} artwork`}
                    className="size-full object-cover"
                  />
                  {isPlaying ? (
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }} />
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                        <span className="w-0.5 bg-emerald-400 animate-pulse" style={{ height: '40%', animationDuration: '0.5s' }} />
                      </span>
                    </span>
                  ) : null}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  {pinHref ? (
                    <Link
                      href={pinHref}
                      className="text-sm font-semibold text-ink truncate hover:text-accent hover:underline"
                      title={`View pin detail for ${currentTrack.title}`}
                    >
                      {currentTrack.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-ink truncate">
                      {currentTrack.title}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-faint">·</span>
                  <Link
                    href={`/search?q=${encodeURIComponent(currentTrack.artist)}`}
                    className="shrink-0 text-xs font-medium text-muted truncate hover:text-ink hover:underline cursor-pointer"
                    title={`Search for pins by ${currentTrack.artist}`}
                  >
                    {currentTrack.artist}
                  </Link>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                  <span role="img" aria-label={currentTrack.country}>{currentTrack.countryFlag}</span>
                  <span className="font-semibold">#{currentTrack.rank} {currentTrack.chartName}</span>
                  <span className="text-subtle">({currentTrack.year})</span>
                </p>
              </div>
            </div>

            {/* Mobile Play / Full Song / Prev / Next (swipe the dock down to close) */}
            <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
              {currentTrack.youtubeId && pinHref ? (
                <Link
                  href={`${pinHref}${pinHref.includes('?') ? '&' : '?'}autoplay=1`}
                  onClick={() => {
                    pause();
                    closePlayer();
                  }}
                  className="flex items-center gap-1 rounded-full bg-red-600 hover:bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs cursor-pointer hover:no-underline transition-colors shrink-0"
                  title="Open pin detail and play full song"
                >
                  <svg className="size-3 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="hidden min-[420px]:inline">Full Song on Pin</span>
                  <span className="min-[420px]:hidden">Full Song</span>
                  <span aria-hidden="true" className="text-[10px]">↗</span>
                </Link>
              ) : null}
              <button
                type="button"
                onClick={prevTrack}
                className="flex size-8 items-center justify-center rounded-full bg-raised hover:bg-raised-2 text-ink active:scale-95 transition-all cursor-pointer ring-1 ring-line/50"
                aria-label="Previous pin music"
                title="Previous track"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => togglePlay()}
                className="flex size-9 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer ring-1 ring-emerald-500/30"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="size-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="size-4.5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="flex size-8 items-center justify-center rounded-full bg-raised hover:bg-raised-2 text-ink active:scale-95 transition-all cursor-pointer ring-1 ring-line/50"
                aria-label="Next pin music"
                title="Next track"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Right desktop actions: Pin link, volume, close */}
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {/* Locate in rankings: scroll on the landing page, else go there */}
              {currentTrack ? (
                <Link
                  href={`/music${locateHash}`}
                  className={locateClass}
                  title="Show this song in the music rankings"
                  aria-label="Show in rankings"
                  onClick={(e) => {
                    if (!/\/music\/?$/.test(window.location.pathname)) return;
                    e.preventDefault();
                    window.history.replaceState(null, '', window.location.pathname + window.location.search + locateHash);
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                >
                  {locateInner}
                </Link>
              ) : null}

              {/* Full Song on Pin Link */}
              {pinHref ? (
                <Link
                  href={`${pinHref}${pinHref.includes('?') ? '&' : '?'}autoplay=1`}
                  onClick={() => {
                    pause();
                    closePlayer();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white px-3.5 py-1 text-xs font-semibold shadow-xs transition-colors hover:no-underline"
                  title="Open pin detail and play full song"
                >
                  <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Full Song on Pin</span>
                  <span aria-hidden="true" className="text-xs">↗</span>
                </Link>
              ) : null}

              {/* Continue to play when ended toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={continuePlaying}
                onClick={() => setContinuePlaying((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border ${
                  continuePlaying
                    ? 'bg-accent/15 text-accent border-accent/40 ring-1 ring-accent/20'
                    : 'bg-raised/80 text-muted hover:text-ink border-line'
                }`}
                title={continuePlaying ? 'Continue to play when ended: Enabled' : 'Continue to play when ended: Disabled'}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${continuePlaying ? 'bg-accent animate-pulse' : 'bg-muted/60'}`}
                />
                <span>Auto-play</span>
              </button>

              {/* Volume toggle & slider */}
              <div className="flex items-center gap-1.5 rounded-full bg-raised/80 px-2.5 py-1 border border-line">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 text-muted hover:text-ink transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-emerald-600 bg-line rounded-full cursor-pointer"
                  aria-label="Volume slider"
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closePlayer}
                className="flex size-8 items-center justify-center rounded-full bg-raised/70 hover:bg-raised-2 text-muted hover:text-ink transition-colors cursor-pointer border border-line"
                aria-label="Dismiss audio player"
              >
                <svg className="size-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Timeline progress scrubber bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop previous track button */}
            <button
              type="button"
              onClick={prevTrack}
              className="hidden sm:flex size-8 items-center justify-center rounded-full bg-raised hover:bg-raised-2 text-ink active:scale-95 transition-all cursor-pointer shrink-0 border border-line"
              aria-label="Previous pin music"
              title="Previous music track"
            >
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Desktop play/pause toggle button */}
            <button
              type="button"
              onClick={() => togglePlay()}
              className="hidden sm:flex size-9 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer shrink-0 ring-1 ring-emerald-500/30"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="size-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="size-4.5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Desktop next track button */}
            <button
              type="button"
              onClick={nextTrack}
              className="hidden sm:flex size-8 items-center justify-center rounded-full bg-raised hover:bg-raised-2 text-ink active:scale-95 transition-all cursor-pointer shrink-0 border border-line"
              aria-label="Next pin music"
              title="Next music track"
            >
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            <span className="text-xs font-mono font-medium tabular-nums text-muted shrink-0 w-8 text-right">
              {formatTime(currentTime)}
            </span>

            <div
              ref={progressRef}
              onClick={handleProgressBarClick}
              className="relative flex-1 h-2.5 rounded-full bg-raised border border-line/60 cursor-pointer overflow-hidden group py-1"
            >
              <div
                className="absolute inset-y-0 left-0 bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
              {/* Scrubber head indicator on hover */}
              <div
                className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-mono font-medium tabular-nums text-muted shrink-0 whitespace-nowrap">
              {formatTime(duration)}
              {(currentTrack?.audioUrl?.includes('itunes.apple.com') || currentTrack?.audioUrl?.startsWith('/api/music/preview/')) ? (
                <a
                  href={
                    currentTrack.audioUrl?.startsWith('/api/music/preview/')
                      ? `https://www.deezer.com/track/${currentTrack.audioUrl.split('/').pop()}`
                      : `https://music.apple.com/search?term=${encodeURIComponent(`${currentTrack.title} ${currentTrack.artist}`)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 leading-none rounded-full border border-line bg-raised px-2 py-1 font-sans text-[11px] font-semibold text-ink transition-colors hover:bg-raised-2 hover:no-underline"
                  title="Open the source of this 30-second clip"
                >
                  <svg className="size-3 text-[#fa243c]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 18V5l12-2v13a3 3 0 1 1-2-2.82V7.3L11 8.6V18a3 3 0 1 1-2-2.82z" />
                  </svg>
                  {currentTrack.audioUrl?.startsWith('/api/music/preview/') ? 'Deezer' : 'Apple Music'} ↗
                </a>
              ) : null}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
