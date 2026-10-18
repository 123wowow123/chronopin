import type { MusicRankingEntry } from '@/lib/music';

// Billboard-style stat block: the song's chart run on the left, the album's sales on the right.
export function MusicStats({ entry }: { entry: MusicRankingEntry }) {
  const song = entry.songStats;
  const album = entry.album?.stats;
  const weeksAt1 = song?.weeksAtNumberOne ?? entry.weeksAtNumberOne ?? null;
  const rows: [string, string | number][] = [];
  if (song?.peak != null) rows.push(['Peak', song.peak]);
  if (weeksAt1 != null && weeksAt1 > 0) rows.push(['Weeks at No. 1', weeksAt1]);
  if (song?.weeksOnChart != null) rows.push(['Weeks on chart', song.weeksOnChart]);
  const certs = album?.certifications ?? [];
  const hasAlbum = certs.length > 0 || album?.units || album?.peak;
  if (rows.length === 0 && !hasAlbum) return null;

  return (
    <div className="mt-3 grid gap-x-8 gap-y-3 border-t border-line pt-3 text-xs sm:grid-cols-2">
      {rows.length > 0 ? (
        <dl className="space-y-1">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Chart run{song?.chart ? ` · ${song.chart}` : ''}
          </dt>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 sm:justify-start">
              <dt className="w-32 text-[11px] uppercase tracking-wide text-muted">{k}</dt>
              <dd className="font-bold text-ink">{v}</dd>
            </div>
          ))}
          {song?.sourceUrl ? (
            <a href={song.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-link">Source ↗</a>
          ) : null}
        </dl>
      ) : null}
      {hasAlbum ? (
        <dl className="space-y-1">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Album sales · {entry.album?.title}</dt>
          {album?.peak ? (
            <div className="flex gap-4">
              <dt className="w-32 text-[11px] uppercase tracking-wide text-muted">Album peak</dt>
              <dd className="font-bold text-ink">#{album.peak.position} <span className="font-normal text-muted">{album.peak.chart}</span></dd>
            </div>
          ) : null}
          {album?.units ? (
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wide text-muted">Units</dt>
              <dd className="font-bold text-ink">{album.units}</dd>
            </div>
          ) : null}
          {certs.length > 0 ? (
            <div className="flex gap-4">
              <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wide text-muted">Certified</dt>
              <dd className="flex flex-wrap gap-1">
                {certs.map((c, i) => (
                  <span key={i} className="rounded-full bg-raised px-2 py-0.5 font-semibold text-ink ring-1 ring-line ring-inset" title={[c.body, c.region, c.date].filter(Boolean).join(' · ')}>
                    {c.level} <span className="font-normal text-muted">{c.body}</span>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {album?.sourceUrl ? (
            <a href={album.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-link">Source ↗</a>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
