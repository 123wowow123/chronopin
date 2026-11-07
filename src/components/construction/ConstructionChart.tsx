import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import { getT } from '@/lib/i18n/server';
import { CONSTRUCTION_YEARS, type ConstructionBar, type ConstructionStatus } from '@/server/services/construction';

// Fixed shades like the buildout stages on the pin page: they carry both themes.
const TONE: Record<ConstructionStatus, string> = { Proposed: 'bg-slate-400', 'In Progress': 'bg-blue-600', Completed: 'bg-emerald-500' };
const STATUS_KEY: Record<ConstructionStatus, 'proposed' | 'inProgress' | 'completed'> = { Proposed: 'proposed', 'In Progress': 'inProgress', Completed: 'completed' };

const DAY = 86_400_000;

// A span chart of one year: a row per build, its bar from groundbreaking to
// completion clipped to the year, with an arrow where the build runs on past it.
export async function ConstructionChart({ bars, year, now }: { bars: ConstructionBar[]; year: number; now: number }) {
  const t = await getT();
  const from = Date.UTC(year, 0, 1);
  const span = Date.UTC(year + CONSTRUCTION_YEARS, 0, 1) - from;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - from) / span) * 100));
  const today = now >= from && now < from + span ? pct(now) : null;
  // A column per year, with a faint line at each quarter.
  const years = Array.from({ length: CONSTRUCTION_YEARS }, (_, i) => ({ m: i * 4, left: pct(Date.UTC(year + i, 0, 1)), label: String(year + i) }));
  const quarters = Array.from({ length: CONSTRUCTION_YEARS <= 5 ? CONSTRUCTION_YEARS * 4 : CONSTRUCTION_YEARS }, (_, q) => ({ m: q, left: pct(Date.UTC(year + (CONSTRUCTION_YEARS <= 5 ? Math.floor(q / 4) : q), CONSTRUCTION_YEARS <= 5 ? (q % 4) * 3 : 0, 1)), year: CONSTRUCTION_YEARS > 5 || q % 4 === 0 }));
  const fmt = new Intl.DateTimeFormat(t.locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <div className="min-w-[760px]">
        <div className="relative ms-[16rem] h-8 border-b border-line text-xs text-muted">
          {years.map((mo) => <span key={mo.m} className="absolute top-2 border-s border-line ps-1 font-medium" style={{ left: `${mo.left}%` }}>{mo.label}</span>)}
        </div>
        <ul>
          {bars.map((bar) => {
            const s = Date.parse(bar.start);
            const e = Date.parse(bar.end);
            const left = pct(s);
            const width = Math.max(0.6, pct(e) - left);
            const days = Math.round((e - s) / DAY);
            const label = `${bar.title}: ${fmt.format(s)} → ${fmt.format(e)} (${t(`reserved.${STATUS_KEY[bar.status]}`)})`;
            return (
              <li key={bar.id} className="flex items-center border-b border-line/60 last:border-b-0 hover:bg-page/60">
                <Link href={bar.href} className="flex w-64 shrink-0 items-center gap-2 px-3 py-1 text-sm" title={label}>
                  <PinThumb thumbName={bar.thumbName} originalUrl={bar.originalUrl} title={bar.title} className="h-9 w-12" />
                  <span className="min-w-0">
                    <span className="block truncate">{bar.title}</span>
                    <span className="block truncate text-xs text-muted">{[bar.city, bar.country].filter(Boolean).join(', ')}</span>
                  </span>
                </Link>
                <div className="relative h-11 flex-1">
                  {quarters.map((q) => <span key={q.m} className={`absolute inset-y-0 border-s ${q.year ? 'border-line' : 'border-line/30'}`} style={{ left: `${q.left}%` }} />)}
                  {today !== null && <span className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${today}%` }} />}
                  <Link href={bar.href} aria-label={label} title={`${label} · ${days} d`} className={`absolute top-3 h-5 rounded ${TONE[bar.status]} ${s < from ? 'rounded-s-none' : ''} ${e >= from + span ? 'rounded-e-none' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
