'use client';

import { useState } from 'react';
import type { MusicRankingEntry } from '@/lib/music';
import { useMusicPlayer } from './MusicPlayerContext';

// Plays an album track as a regular queue entry so the global player bar, next/previous and
// the 30s progress all work unchanged. The `~t<n>` suffix is stripped for "locate on page".
export function albumTrackEntry(song: MusicRankingEntry, n: number): MusicRankingEntry | undefined {
  const t = song.album?.tracks.find((x) => x.n === n);
  if (!t) return undefined;
  return {
    ...song,
    id: `${song.id}~t${n}`,
    title: t.title,
    audioUrl: t.previewUrl,
    youtubeId: undefined,
    youtubeUrl: undefined,
    artworkUrl: song.album?.artworkUrl || song.artworkUrl,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');

export function AlbumTracklist({
  song,
  open: initiallyOpen = false,
  scroll = true,
}: {
  song: MusicRankingEntry;
  pinHref?: string;
  queue?: MusicRankingEntry[];
  open?: boolean;
  scroll?: boolean;
}) {
  const album = song.album;
  const [open, setOpen] = useState(initiallyOpen);
  const { currentTrack, isPlaying, togglePlay } = useMusicPlayer();
  if (!album) return null;

  const queue = album.tracks.map((t) => albumTrackEntry(song, t.n)!).filter(Boolean);
  const kind = album.kind === 'album' ? 'Album' : album.kind === 'ep' ? 'EP' : 'Single';

  return (
    <div className={`${scroll ? 'mb-2 border-[var(--rule)]/60 bg-[var(--paper)]/80' : 'border-line bg-raised/40'} rounded-lg border text-xs`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--soft)]">{kind} · </span>
          <span className="font-semibold text-[var(--text)]">{album.title}</span>
        </span>
        <span className="shrink-0 text-[10px] text-[var(--soft)]">
          {album.tracks.length} track{album.tracks.length === 1 ? '' : 's'} · 30s {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? (
        <ol className={`divide-y border-t ${scroll ? 'divide-[var(--rule)]/50 border-[var(--rule)]/60 max-h-64 overflow-y-auto overscroll-contain pb-1' : 'divide-line border-line'}`}>
          {queue.map((entry, i) => {
            const t = album.tracks[i];
            const playing = currentTrack?.id === entry.id && isPlaying;
            const isThis = norm(t.title) === norm(song.title);
            return (
              <li key={t.n} className="flex items-center gap-2 px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => togglePlay(entry, queue)}
                  aria-label={`${playing ? 'Pause' : 'Play'} 30 second preview of ${t.title}`}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--green,#1f7a4d)]/40 text-[var(--green,#1f7a4d)] transition-colors hover:bg-[var(--green,#1f7a4d)]/10"
                >
                  <svg className="size-3 fill-current" viewBox="0 0 24 24">
                    {playing ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /> : <path d="M8 5v14l11-7z" />}
                  </svg>
                </button>
                <span className="w-5 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--soft)]">{t.n}</span>
                <span className={`min-w-0 flex-1 truncate ${isThis ? 'font-semibold text-[var(--green,#1f7a4d)]' : 'text-[var(--text)]'}`}>
                  {t.title}
                </span>
                <span className="font-mono text-[10px] text-[var(--soft)]">0:30</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
