import Link from '@/components/ui/Link';
import { CANDIDATE_CATEGORIES, type CandidateCategory, type PinCandidateJson } from '@/lib/candidates';
import type { Translator } from '@/lib/i18n/translate';
import { localizePath } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';

const TITLE_KEYS = {
  record: 'pin.candidateRecord',
  album: 'pin.candidateAlbum',
  song: 'pin.candidateSong',
  artist: 'pin.candidateArtist',
} as const satisfies Record<CandidateCategory, string>;

// The big four awards categories and who is expected in them (PinCandidate,
// 0146): a card per category, the favourites first with the market's price
// as a bar, each candidate linking to the pin for its work.
export function PinCandidates({ candidates, t }: { candidates: PinCandidateJson[]; t: Translator }) {
  const asOf = candidates.map((c) => c.asOf).sort().at(-1);
  const date = asOf
    ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${asOf}T00:00:00Z`))
    : '';
  const groups = CANDIDATE_CATEGORIES.map((category) => ({ category, rows: candidates.filter((c) => c.category === category) })).filter((g) => g.rows.length);
  if (!groups.length) return null;
  return (
    <section aria-labelledby="candidates-heading" className="mb-5">
      <h2 id="candidates-heading" className="mb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        {t('pin.candidatesHeading')}
      </h2>
      <p className="mb-3 text-xs text-subtle">{t('pin.candidatesNote', { date })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map(({ category, rows }) => (
          <div key={category} className="surface rounded-lg p-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <span aria-hidden>{category === 'artist' ? '🌟' : '🏆'}</span>
              {t(TITLE_KEYS[category])}
            </h3>
            <p className="mt-0.5 mb-2.5 text-xs text-subtle">{t(rows[0].oddsLabel === 'winner' ? 'pin.candidateWinner' : 'pin.candidateNominee')}</p>
            <ol className="flex flex-col gap-2.5">
              {rows.map((c) => (
                <li key={`${c.category}-${c.rank}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-2 text-sm">
                  <span className="pt-px text-xs font-semibold tabular-nums text-subtle">{c.rank}</span>
                  <div className="min-w-0">
                    <div className="leading-snug">
                      {c.work ? (
                        <Link href={localizePath(pinPath(c.work), t.locale)} className="font-medium text-link hover:underline">
                          {c.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{c.name}</span>
                      )}
                      {c.artist ? <span className="text-subtle"> · {c.artist}</span> : null}
                    </div>
                    {c.odds != null ? (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-raised" role="presentation">
                          <div className="h-full rounded-full bg-link/70" style={{ width: `${Math.max(2, c.odds)}%` }} />
                        </div>
                        <span className="w-9 shrink-0 text-end text-xs tabular-nums text-muted">{c.odds}%</span>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
