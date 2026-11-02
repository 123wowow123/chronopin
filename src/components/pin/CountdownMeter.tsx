'use client';

import { useNow } from '@/lib/client/now';
import { dayAgo, dayKeyOf, dayKeyParts, formatDayKey, timeAgo } from '@/lib/format';
import { delayLabel } from '@/lib/delay';
import { useT } from '@/lib/client/i18n';
import { DATE_KIND_KEYS, type PinDateKind } from '@/lib/pinDateKind';
import type { Translator } from '@/lib/i18n/translate';
import { BUILD_STAGES, milestoneStage, type BuildMark, type BuildStage } from '@/lib/pinFactory';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

// The wait from now to a start, as whole calendar years and the rest: the
// same date N years on counts as N years, so leap days fall in the days.
function splitYears(now: number, startMs: number) {
  const at = (years: number) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + years);
    return d.getTime();
  };
  let years = Math.max(0, Math.floor((startMs - now) / (366 * DAY)));
  while (at(years + 1) <= startMs) years++;
  return { years, rest: startMs - at(years) };
}

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
type Stretch = { from: number; to: number; late: boolean; tone: number; phase?: number; label?: string };

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

// A colour per buildout stage, in the order of the stage trail on the pin:
// announced, under construction, commissioning, commercial production. Warm
// colours are kept for delay: late stretches keep their own oranges and reds.
const PHASE_TONES = [
  { fill: 'bg-slate-400', track: 'bg-slate-400/25' },
  { fill: 'bg-blue-600', track: 'bg-blue-600/20' },
  { fill: 'bg-violet-500', track: 'bg-violet-500/20' },
  { fill: 'bg-emerald-500', track: 'bg-emerald-500/20' },
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

// The build cut into its stages. A stage begins at the first milestone whose
// wording marks it; a stage no milestone reaches is left out, and a stage that
// would begin before the last one did is dropped. Construction runs from
// groundbreaking, and an announcement dated before it opens the bar earlier.
function phases(from: number, to: number, marks: BuildMark[], t: Translator, allowAnnounce: boolean): Stretch[] {
  const first = (stage: BuildStage) => {
    const at = marks.filter((m) => milestoneStage(m.label) === stage).map((m) => m.at);
    return at.length ? Math.min(...at) : NaN;
  };
  const announced = first('announced');
  const starts: { stage: number; at: number }[] = [];
  if (allowAnnounce && announced < from) starts.push({ stage: 0, at: announced });
  starts.push({ stage: 1, at: from });
  for (const stage of [2, 3]) {
    const at = first(BUILD_STAGES[stage]);
    if (at > starts[starts.length - 1].at && at < to) starts.push({ stage, at });
  }
  return starts.map(({ stage, at }, i) => ({
    from: at,
    to: starts[i + 1]?.at ?? to,
    late: false,
    tone: 0,
    phase: stage,
    label: t(`pin.factory.${BUILD_STAGES[stage]}`),
  }));
}

function stretchTitle(part: Stretch, t: Translator) {
  const [from, to] = [keyOf(part.from), keyOf(part.to)];
  const dates = { from: formatDayKey(from, t.locale), to: formatDayKey(to, t.locale) };
  return part.late ? t('countdown.stretchLate', { span: delayLabel(from, to, t.locale), ...dates }) : t('countdown.stretchPromised', dates);
}

// A live countdown to a pin's start, with a bar filling over the span from
// when it was posted. Once started it says how long ago. A delayed pin's bar
// is cut into the stretches of the wait, each slipped one its own shade.
//
// A construction pin (end given: its completion) runs the bar over the build
// itself, groundbreaking to completion, with any slip of the start in front
// of it in its own shade.
export function CountdownMeter({ start, since, allDay, originalStart, end, marks = [], kind }: { start: string; since?: string; allDay?: boolean; originalStart?: string | null; end?: string | null; marks?: BuildMark[]; kind?: PinDateKind }) {
  const tick = useNow(SECOND);
  const t = useT();
  const now = tick || null;
  const startMs = localStart(start, allDay);
  const started = now != null && startMs - now <= 0;

  if (now == null || isNaN(startMs)) {
    return <div className="my-3 h-[26px]" />;
  }

  const { years, rest: remaining } = splitYears(now, startMs);
  const days = Math.floor(remaining / DAY);
  const sinceMs = since ? new Date(since).getTime() : NaN;
  // The day first promised, when the start has slipped past it since.
  const originalMs = originalStart ? localDay(originalStart) : NaN;
  const delayed = !isNaN(originalMs) && originalMs < startMs;
  // A pin already late the day it was posted still shows the whole slip: its
  // bar opens on the first promise rather than on posting.
  const from = delayed ? Math.min(originalMs, isNaN(sinceMs) ? originalMs : sinceMs) : sinceMs;
  const span = startMs - from;
  const endMs = end ? localStart(end, allDay) - (allDay ? DAY : 0) : NaN;
  const build = !isNaN(endMs) && endMs > startMs;
  const percent = build ? Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100)) : started ? 100 : !isNaN(from) && span > 0 ? Math.min(100, Math.max(0, ((now - from) / span) * 100)) : 0;
  const completes = build ? t(kind ? DATE_KIND_KEYS[kind].ends : 'countdown.completes', { when: formatDayKey(keyOf(endMs), t.locale) }) : '';
  let parts = delayed && span > 0 ? stretches(from, startMs, [originalMs, sinceMs]) : [];
  if (build) {
    parts = [
      ...(delayed ? [{ from: originalMs, to: startMs, late: true, tone: 0 }] : []),
      ...phases(startMs, endMs, marks, t, !delayed),
    ];
  }
  const fillClass = started ? 'bg-past' : 'bg-future';
  // A day or more on, the exact years and days ("1y 9d") rather than a
  // rounded "last year"; under a day, the nearest hour or minute.
  const gone = splitYears(startMs, now);
  const goneDays = Math.floor(gone.rest / DAY);
  const agoLabel =
    started && (gone.years > 0 || goneDays > 0)
      ? t('countdown.startedSpan', {
          span: [gone.years > 0 ? t('countdown.years', { count: gone.years }) : '', t('countdown.days', { count: goneDays })].filter(Boolean).join(' '),
        })
      : t('countdown.startedAgo', { ago: allDay ? dayAgo(startMs, now, t.locale) : timeAgo(start, now, t.locale) });

  return (
    <div className={`my-3 flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs ${started ? 'border-past/30 bg-past/10' : 'border-future/30 bg-future/10'}`}>
      {build && started ? <span className="text-subtle">{agoLabel}</span> : null}
      {!started ? <span className="font-bold tracking-wider text-future uppercase">{t('countdown.startsIn')}</span> : null}
      <div className="relative flex h-1.5 flex-1 gap-0.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={started ? t('countdown.started') : t('countdown.elapsed')}>
        {parts.length ? (
          parts.map((part) => (
            <div key={part.from} className={`relative overflow-hidden rounded-full ${part.late ? LATE_TONES[part.tone].track : part.phase != null ? PHASE_TONES[part.phase % PHASE_TONES.length].track : 'bg-raised-2'}`} style={{ flexGrow: part.to - part.from, flexBasis: 0, minWidth: 3 }} title={build && !part.late ? part.label : stretchTitle(part, t)}>
              <div
                className={`absolute inset-y-0 start-0 rounded-full ${part.late ? LATE_TONES[part.tone].fill : part.phase != null ? PHASE_TONES[part.phase % PHASE_TONES.length].fill : fillClass}`}
                style={{ width: `${Math.min(100, Math.max(0, ((now - part.from) / (part.to - part.from)) * 100))}%` }}
              />
            </div>
          ))
        ) : (
          <div className="relative flex-1 overflow-hidden rounded-full bg-raised-2">
            <div className={`absolute inset-y-0 start-0 rounded-full ${fillClass}`} style={{ width: `${percent}%` }} />
          </div>
        )}
        {build
          ? marks.map((mark) => {
              const latest = mark.at <= now && !marks.some((m) => m.at > mark.at && m.at <= now);
              const at = ((mark.at - parts[0].from) / (endMs - parts[0].from)) * 100;
              return at > 1 && at < 99 ? (
                <span key={`${mark.label}${mark.at}`} tabIndex={0} className={`group absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none${latest ? ' z-[1]' : ''}`} style={{ insetInlineStart: `${at}%` }}>
                  <span className={`rounded-full border-2 ${latest ? 'size-4 border-white bg-past shadow-md ring-2 ring-past/50' : `size-2.5 border-panel ${mark.at <= now ? 'bg-past' : 'bg-subtle'}`}`} />
                  <span role="tooltip" className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border border-line bg-popover px-2 py-1 text-xs whitespace-nowrap text-ink shadow-lg group-hover:block group-focus:block">
                    {mark.label}: {mark.date}
                  </span>
                </span>
              ) : null;
            })
          : null}
      </div>
      {started ? (
        <span className="text-subtle">{build ? completes : agoLabel}</span>
      ) : (
        <span className="font-mono text-sm text-future tabular-nums">
          {years > 0 ? <b className="me-1">{t('countdown.years', { count: years })}</b> : null}
          {years > 0 || days > 0 ? <b className="me-1">{t('countdown.days', { count: days })}</b> : null}
          {[Math.floor((remaining % DAY) / HOUR), Math.floor((remaining % HOUR) / MINUTE), Math.floor((remaining % MINUTE) / SECOND)].map(pad).join(':')}
        </span>
      )}
    </div>
  );
}
