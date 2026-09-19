'use client';

import { useNow } from '@/lib/client/now';
import { timeAgo } from '@/lib/format';
import { useT } from '@/lib/client/i18n';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

// When a pin starts on the viewer's clock: its instant, or for an all-day pin
// local midnight of its (UTC) date.
function localStart(utcStartDateTime: string, allDay?: boolean) {
  const d = new Date(utcStartDateTime);
  return allDay ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime() : d.getTime();
}

// A live countdown to a pin's start, with a bar filling over the span from
// when it was posted. Once started it says how long ago.
export function CountdownMeter({ start, since, allDay }: { start: string; since?: string; allDay?: boolean }) {
  const tick = useNow(SECOND);
  const t = useT();
  const now = tick || null;
  const startMs = localStart(start, allDay);
  const started = now != null && startMs - now <= 0;

  if (now == null || isNaN(startMs)) {
    return <div className="my-3 h-[26px]" />;
  }

  const remaining = startMs - now;
  const sinceMs = since ? new Date(since).getTime() : NaN;
  const span = startMs - sinceMs;
  const percent = started ? 100 : !isNaN(sinceMs) && span > 0 ? Math.min(100, Math.max(0, ((now - sinceMs) / span) * 100)) : 0;

  return (
    <div className={`my-3 flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs ${started ? 'border-line bg-panel' : 'border-future/30 bg-future/10'}`}>
      {!started ? <span className="font-bold tracking-wider text-future uppercase">{t('countdown.startsIn')}</span> : null}
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-raised-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={started ? t('countdown.started') : t('countdown.elapsed')}>
        <div className="absolute h-full rounded-full bg-future" style={{ width: `${percent}%` }} />
      </div>
      {started ? (
        <span className="text-subtle">{t('countdown.startedAgo', { ago: timeAgo(start, now, t.locale) })}</span>
      ) : (
        <span className="font-mono text-sm text-future tabular-nums">
          {Math.floor(remaining / DAY) > 0 ? <b className="mr-1">{t('countdown.days', { count: Math.floor(remaining / DAY) })}</b> : null}
          {[Math.floor((remaining % DAY) / HOUR), Math.floor((remaining % HOUR) / MINUTE), Math.floor((remaining % MINUTE) / SECOND)].map(pad).join(':')}
        </span>
      )}
    </div>
  );
}
