'use client';

import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';
import { electionPath, type ElectionParty, type SearchedElection } from '@/lib/elections';
import { SeatBar } from './SeatBar';

const PARTY_KEY = { D: 'election.democrats', R: 'election.republicans', I: 'election.independents' } as const;

function Chamber({ name, d, r, total, majority, winner, note }: { name: string; d: number; r: number; total: number; majority: number; winner: ElectionParty | null; note: string }) {
  const t = useT();
  const line = `${name}: ${t('election.democrats')} ${d}, ${t('election.republicans')} ${r}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">{name}</span>
        {winner ? <span className="text-xs text-muted">{t('election.projected', { party: t(PARTY_KEY[winner]) })}</span> : null}
      </div>
      <SeatBar democrats={d} republicans={r} total={total} majority={majority} label={line} />
      <div className="flex items-baseline justify-between text-sm tabular-nums">
        <span className="whitespace-nowrap text-blue-600">{t('election.democrats')} {d}</span>
        <span className="px-1 text-center text-xs text-muted">{note}</span>
        <span className="whitespace-nowrap text-red-600">{t('election.republicans')} {r}</span>
      </div>
    </div>
  );
}

// The side panel a search for "election" opens: who controls each chamber, linking to the
// year's landing page and to its pins.
export function ElectionPanel({ election }: { election: SearchedElection }) {
  const t = useT();
  const { senate, house } = election;
  return (
    <div className="floating flex flex-col gap-3.5 px-4 py-3.5" data-election-panel>
      <Link href={electionPath(election.year)} className="font-semibold text-ink hover:text-link hover:no-underline">
        {t('election.title', { year: String(election.year) })}
      </Link>
      <Chamber
        name={t('election.senate')}
        d={senate.democrats}
        r={senate.republicans}
        total={100}
        majority={senate.majority}
        winner={senate.projectedWinner}
        note={senate.uncalled ? t('election.uncalledCount', { count: senate.uncalled }) : t('election.majorityNeeded', { count: senate.majority })}
      />
      <Chamber
        name={t('election.house')}
        d={house.democrats}
        r={house.republicans}
        total={435}
        majority={house.majority}
        winner={house.projectedWinner}
        note={house.uncalled ? t('election.uncalledCount', { count: house.uncalled }) : t('election.majorityNeeded', { count: house.majority })}
      />
      <p className="text-xs text-muted">{t('election.source', { time: election.updated.house })}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={electionPath(election.year)} className="underline underline-offset-2">{t('election.fullResults', { year: String(election.year) })}</Link>
        <Link href={`/pin/${election.pins.hub}`} className="underline underline-offset-2">{t('election.thread')}</Link>
      </div>
    </div>
  );
}
