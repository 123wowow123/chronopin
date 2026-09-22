'use client';

import { useNow } from '@/lib/client/now';
import { dayKeyOf, dayKeyParts, formatDayKey, timeAgo } from '@/lib/format';
import { delayLabel } from '@/lib/delay';
import { useT } from '@/lib/client/i18n';
import type { Translator } from '@/lib/i18n/translate';

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

// Local midnight of a day key, the way originalStartDate is stored. Built by
// hand so years under 100 (and BC) do not land in the 1900s.
function localDay(dayKey: string) {
  const [y, m, d] = dayKeyParts(dayKey);
  const at = new Date(2000, 0, 1);
  at.setFullYear(y, m - 1, d);
  return at.getTime();
}

const keyOf = (ms: number) => {
  const d = new Date(ms);
  return dayKeyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

// One stretch of the wait, between two dates that mattered: the day the pin
// was posted and the day it was first promised for. tone picks its colour.
type Stretch = { from: number; to: number; late: boolean; tone: number };

// A colour per slipped stretch, deepening as the delay piles up, so the
// breaks in the bar read without hovering. A pin delayed more times than the
// ramp is long holds its last shade. Fixed Tailwind shades rather than the
// status tokens: these are washes, and they carry both themes (like the
// bg-red-500/15 badges).
const LATE_TONES = [
  { fill: 'bg-orange-400', track: 'bg-orange-400/20' },
  { fill: 'bg-red-600', track: 'bg-red-600/20' },
  { fill: 'bg-rose-800', track: 'bg-rose-800/25' },
];

// The wait cut at every date that moved it. Without a delay that is the one
// stretch from posting to the start; with one, the bar also breaks where the
// first promise fell due, so the slipped part can be coloured on its own.
function stretches(from: number, to: number, marks: number[]): Stretch[] {
  const inner = [...new Set(marks.filter((m) => m > from && m < to))].sort((a, b) => a - b);
  const bounds = [from, ...inner, to];
  const first = marks[0];
  let tone = -1;
  return bounds.slice(1).map((end, i) => {
    const late = !isNaN(first) && bounds[i] >= first;
    return { from: bounds[i], to: end, late, tone: late ? (tone = Math.min(tone + 1, LATE_TONES.length - 1)) : 0 };
  });
}

function stretchTitle(part: Stretch, t: Translator) {
  const [from, to] = [keyOf(part.from), keyOf(part.to)];
  const dates = { from: formatDayKey(from, t.locale), to: formatDayKey(to, t.locale) };
  return part.late ? t('countdown.stretchLate', { span: delayLabel(from, to, t.locale), ...dates }) : t('countdown.stretchPromised', dates);
}

// A live countdown to a pin's start, with a bar filling over the span from
// when it was posted. Once started it says how long ago. A delayed pin's bar
// is cut into the stretches of the wait, each slipped one its own shade.
export function CountdownMeter({ start, since, allDay, originalStart }: { start: string; since?: string; allDay?: boolean; originalStart?: string | null }) {
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
  // The day first promised, when the start has slipped past it since.
  const originalMs = originalStart ? localDay(originalStart) : NaN;
  const delayed = !isNaN(originalMs) && originalMs < startMs;
  // A pin already late the day it was posted still shows the whole slip: its
  // bar opens on the first promise rather than on posting.
  const from = delayed ? Math.min(originalMs, isNaN(sinceMs) ? originalMs : sinceMs) : sinceMs;
  const span = startMs - from;
  const percent = started ? 100 : !isNaN(from) && span > 0 ? Math.min(100, Math.max(0, ((now - from) / span) * 100)) : 0;
  const parts = delayed && span > 0 ? stretches(from, startMs, [originalMs, sinceMs]) : [];
  const fillClass = started ? 'bg-past' : 'bg-future';

  return (
    <div className={`my-3 flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs ${started ? 'border-past/30 bg-past/10' : 'border-future/30 bg-future/10'}`}>
      {!started ? <span className="font-bold tracking-wider text-future uppercase">{t('countdown.startsIn')}</span> : null}
      <div className="flex h-1.5 flex-1 gap-0.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={started ? t('countdown.started') : t('countdown.elapsed')}>
        {parts.length ? (
          parts.map((part) => (
            <div key={part.from} className={`relative overflow-hidden rounded-full ${part.late ? LATE_TONES[part.tone].track : 'bg-raised-2'}`} style={{ flexGrow: part.to - part.from, flexBasis: 0, minWidth: 3 }} title={stretchTitle(part, t)}>
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${part.late ? LATE_TONES[part.tone].fill : fillClass}`}
                style={{ width: `${Math.min(100, Math.max(0, ((now - part.from) / (part.to - part.from)) * 100))}%` }}
              />
            </div>
          ))
        ) : (
          <div className="relative flex-1 overflow-hidden rounded-full bg-raised-2">
            <div className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`} style={{ width: `${percent}%` }} />
          </div>
        )}
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
