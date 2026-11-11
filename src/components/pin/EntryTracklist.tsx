"use client";

import { albumTrackEntry } from "@/components/music/AlbumTracklist";
import { useMusicPlayer } from "@/components/music/MusicPlayerContext";
import { useT } from "@/lib/client/i18n";
import type { PinCandidateJson } from "@/lib/candidates";
import type { MusicRankingEntry } from "@/lib/music";
import type { MessageKey } from "@/lib/i18n/translate";

// The entries as the tracks of one album, so each row plays through the same
// queue and global player bar as an album on a music pin (albumTrackEntry).
const songOf = (rows: PinCandidateJson[], pinId: number): MusicRankingEntry =>
  ({
    id: `candidates-${pinId}`,
    year: Number(rows[0].asOf.slice(0, 4)),
    rank: 1,
    title: "",
    artist: "",
    continent: "Asia",
    genres: [],
    artworkUrl: "",
    summary: "",
    album: {
      title: "",
      kind: "album",
      tracks: rows.map((r, i) => ({
        n: i + 1,
        title: r.name,
        artist: r.artist ?? undefined,
        previewUrl: r.previewUrl ?? "",
      })),
    },
  }) as unknown as MusicRankingEntry;

// One contender row per entry: the album tracklist's round play button, then
// rank, song, performer and the market's price as a bar across the row.
export function EntryTracklist({
  rows,
  pinId,
}: {
  rows: PinCandidateJson[];
  pinId: number;
}) {
  const t = useT();
  const { currentTrack, isPlaying, togglePlay } = useMusicPlayer();
  const song = songOf(rows, pinId);
  const queue = rows.flatMap((r, i) =>
    r.previewUrl ? [albumTrackEntry(song, i + 1)!] : [],
  );
  return (
    <ol className="divide-y divide-line rounded-lg border border-line bg-raised/40 text-sm">
      {rows.map((c, i) => {
        const entry = c.previewUrl ? albumTrackEntry(song, i + 1)! : null;
        const playing = !!entry && currentTrack?.id === entry.id && isPlaying;
        const label = t(
          `guides.music.${playing ? "pausePreviewAria" : "playPreviewAria"}` as MessageKey,
          { title: c.name },
        );
        return (
          <li key={c.rank} className="flex items-center gap-3 px-3 py-2.5">
            {entry ? (
              <button
                type="button"
                onClick={() => togglePlay(entry, queue)}
                aria-label={label}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--green,#1f7a4d)]/40 text-[var(--green,#1f7a4d)] transition-colors hover:bg-[var(--green,#1f7a4d)]/10"
              >
                <svg
                  className="size-3 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  {playing ? (
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
              </button>
            ) : (
              <span className="size-6 shrink-0" />
            )}
            <span className="w-4 shrink-0 text-end font-mono text-xs tabular-nums text-subtle">
              {c.rank}
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <span className="font-medium text-ink">{c.name}</span>
              {c.artist ? (
                <span className="text-subtle"> · {c.artist}</span>
              ) : null}
            </span>
            {c.odds != null ? (
              <span className="flex w-2/5 min-w-28 max-w-xs shrink-0 items-center gap-2">
                <span
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-raised"
                  role="presentation"
                >
                  <span
                    className="block h-full rounded-full bg-link/70"
                    style={{ width: `${Math.max(2, c.odds)}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-end text-xs tabular-nums text-muted">
                  {c.odds}%
                </span>
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
