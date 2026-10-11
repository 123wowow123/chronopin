'use client';

import { useId, useState } from 'react';
import Anchor from '@/components/ui/Anchor';
import { useT } from '@/lib/client/i18n';
import type { Translator } from '@/lib/i18n/translate';
import { CHART_COLORS, OCTAGON_AXES, octagonPoints, octagonRing, phaseYears, safeUrl, type OctagonAxis, type PersonPhase } from '@/lib/people';

const SIZE = 240;
const RADIUS = 78;
// Room either side of the box for the labels of the left and right axes.
const PAD = 66;

// One colour per phase, for the overlap view and the legend.
const COLORS = CHART_COLORS;

// The octagon for a person's life phases: one graph, with a button for each
// phase to switch between them and an overlap view that draws all of them on
// the same octagon, so the shape of a career can be seen changing. Eight axes,
// each scored 0..5 from documented evidence; an axis with no evidence is a gap
// (a dashed spoke, no point), never a zero. There is no total and no ideal
// shape: it is a profile, not a ranking. The table gives each score, its
// rubric, how sure the evidence is, and the source.
// "#3b82f6" at 0.2 -> "rgba(59, 130, 246, 0.2)"
function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// What a phase is called: a generated overview by its translated name, a
// researched phase by the label it was given.
function nameOf(phase: PersonPhase, t: Translator): string {
  return phase.origin === 'generated' || phase.label === 'Overview' ? t('person.octagon.overview') : phase.label;
}

// A vertex of one phase's shape: which phase and which axis.
type Vertex = { phase: number; axis: OctagonAxis };
const same = (a: Vertex | null, b: Vertex | null) => !!a && !!b && a.phase === b.phase && a.axis === b.axis;

export function OctagonChart({ phases, refs }: { phases: PersonPhase[]; refs: Record<string, number> }) {
  const t = useT();
  // Hovering or focusing a vertex shows its value; clicking (or Enter) pins it
  // open, with its source, until it is clicked again, Escape, or the view changes.
  const [hover, setHover] = useState<Vertex | null>(null);
  const [pinned, setPinned] = useState<Vertex | null>(null);
  const uid = useId().replace(/:/g, '');
  // Opens on the overlap, every phase on the one octagon, so the whole shape of
  // a career is seen at once; a person with a single phase just shows it.
  const [view, setView] = useState<number | 'all'>(phases.length > 1 ? 'all' : 0);
  if (!phases.length) return null;
  const overlap = view === 'all' && phases.length > 1;
  const shown = overlap ? phases.map((p, i) => ({ phase: p, color: COLORS[i % COLORS.length] })) : [{ phase: phases[typeof view === 'number' ? view : phases.length - 1], color: COLORS[(typeof view === 'number' ? view : phases.length - 1) % COLORS.length] }];
  const current = shown.length === 1 ? shown[0].phase : null;
  const active = hover ?? pinned;
  const inView = (v: Vertex | null) => !!v && shown.some(({ phase }) => phases.indexOf(phase) === v.phase) && !!phases[v.phase].axes[v.axis];
  // Where each axis ends, where its numbered marker sits, and where its name goes.
  const frame = octagonPoints({}, SIZE, RADIUS, 30);
  const markers = octagonPoints({}, SIZE, RADIUS, 11);
  const label = (p: PersonPhase) => `${nameOf(p, t)}${phaseYears(p) ? ` (${phaseYears(p)})` : ''}`;
  const description = shown
    .map(({ phase }) =>
      `${label(phase)}: ${OCTAGON_AXES.map((axis) => `${t(`person.octagon.axes.${axis}`)} ${phase.axes[axis] ? t('person.octagon.score', { score: phase.axes[axis]!.score }) : t('person.octagon.gap')}`).join(', ')}`,
    )
    .join('. ');

  return (
    <div className="floating flex flex-col gap-4 px-4 py-4 sm:px-5">
      {/* Which phase, or all of them at once. */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('person.octagon.title')}>
        {phases.map((p, i) => {
          const active = view === i;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setView(i);
                setPinned(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                active ? 'bg-accent text-white ring-accent' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
              }`}
            >
              <span className="size-2 rounded-full ring-1 ring-white/80" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              {nameOf(p, t)}
            </button>
          );
        })}
        {phases.length > 1 ? (
          <button
            type="button"
            aria-pressed={overlap}
            onClick={() => {
              setView(overlap ? phases.length - 1 : 'all');
              setPinned(null);
            }}
            className={`ms-auto inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
              overlap ? 'bg-accent text-white ring-accent' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
            }`}
          >
            {t('person.octagon.overlap')}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:items-center">
        {/* A dark panel with glowing, translucent fills: where phases overlap their colours blend. */}
        <div
          className="rounded-2xl p-2 ring-1 ring-white/10"
          style={{
            backgroundColor: '#0a1024',
            backgroundImage: [
              ...shown.slice(0, 3).map(({ color }, i) => `radial-gradient(circle at ${[50, 38, 62][i]}% ${[50, 58, 56][i]}%, ${rgba(color, 0.2)}, transparent 46%)`),
              `radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.12), transparent 70%)`,
            ].join(', '),
          }}
        >
          <div
            className="relative mx-auto w-full max-w-[680px]"
            onClick={() => setPinned(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPinned(null);
            }}
          >
          <svg viewBox={`${-PAD} -4 ${SIZE + PAD * 2} ${SIZE + 8}`} role="group" aria-label={description} className="block w-full">
            <defs>
              <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              {shown.map(({ phase, color }) => (
                <radialGradient key={phase.label} id={`${uid}-${phases.indexOf(phase)}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={color} stopOpacity={overlap ? 0.5 : 0.62} />
                </radialGradient>
              ))}
            </defs>
            {[1, 2, 3, 4, 5].map((level) => (
              <polygon key={level} points={octagonRing(level, SIZE, RADIUS)} fill="none" stroke="#ffffff" strokeOpacity={level === 5 ? 0.55 : 0.18} strokeWidth={level === 5 ? 1 : 0.7} />
            ))}
            {frame.map((p) => {
              const end = octagonPoints({ [p.axis]: { score: 5 } }, SIZE, RADIUS).find((q) => q.axis === p.axis)!;
              // A spoke is dashed where none of the phases shown has evidence for it.
              const gap = shown.every(({ phase }) => !phase.axes[p.axis]);
              return <line key={p.axis} x1={SIZE / 2} y1={SIZE / 2} x2={end.x} y2={end.y} stroke="#ffffff" strokeOpacity={0.3} strokeWidth={0.7} strokeDasharray={gap ? '3 3' : undefined} />;
            })}
            {/* The diffusion: each shape's colour, blurred, spreading past its edge. */}
            <g style={{ mixBlendMode: 'screen' }} filter={`url(#${uid}-glow)`} aria-hidden>
              {shown.map(({ phase, color }) => {
                const scored = octagonPoints(phase.axes, SIZE, RADIUS).filter((p) => p.score != null);
                return scored.length >= 3 ? (
                  <polygon key={phase.label} points={scored.map((p) => `${p.x},${p.y}`).join(' ')} fill={color} fillOpacity={overlap ? 0.5 : 0.6} />
                ) : null;
              })}
            </g>
            <g style={{ mixBlendMode: 'screen' }}>
              {shown.map(({ phase, color }) => {
                const scored = octagonPoints(phase.axes, SIZE, RADIUS).filter((p) => p.score != null);
                const path = scored.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <g key={phase.label}>
                    {scored.length >= 3 ? (
                      <polygon points={path} fill={`url(#${uid}-${phases.indexOf(phase)})`} stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
                    ) : null}
                    {scored.length === 2 ? <polyline points={path} fill="none" stroke={color} strokeWidth={2} /> : null}
                  </g>
                );
              })}
            </g>
            {shown.map(({ phase, color }) =>
              octagonPoints(phase.axes, SIZE, RADIUS)
                .filter((p) => p.score != null)
                .map((p) => {
                  const vertex: Vertex = { phase: phases.indexOf(phase), axis: p.axis };
                  const on = same(active, vertex);
                  const isPinned = same(pinned, vertex);
                  const toggle = () => setPinned(isPinned ? null : vertex);
                  return (
                    <g
                      key={`${phase.label}-${p.axis}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isPinned}
                      aria-label={`${nameOf(phase, t)}, ${t(`person.octagon.axes.${p.axis}`)}: ${t('person.octagon.score', { score: p.score! })}`}
                      className="cursor-pointer outline-none"
                      onMouseEnter={() => setHover(vertex)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(vertex)}
                      onBlur={() => setHover(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                    >
                      <circle cx={p.x} cy={p.y} r={11} fill="transparent" />
                      {on ? <circle cx={p.x} cy={p.y} r={8} fill="none" stroke={color} strokeOpacity={0.7} strokeWidth={1.25} /> : null}
                      <circle cx={p.x} cy={p.y} r={on ? 4.5 : 3} fill={color} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={on ? 1.75 : 1} />
                    </g>
                  );
                }),
            )}
            {markers.map((m, i) => {
              const gap = shown.every(({ phase }) => !phase.axes[m.axis]);
              return (
                <g key={m.axis}>
                  <circle cx={m.labelX} cy={m.labelY - 3} r={8} fill="#0a1024" stroke="#ffffff" strokeOpacity={gap ? 0.35 : 0.85} strokeWidth={1} />
                  <text x={m.labelX} y={m.labelY - 0.2} textAnchor="middle" fontSize={7} fill="#ffffff" fillOpacity={gap ? 0.5 : 1} fontWeight={600}>
                    {String(i + 1).padStart(2, '0')}
                  </text>
                </g>
              );
            })}
            {frame.map((p) => {
              const gap = shown.every(({ phase }) => !phase.axes[p.axis]);
              return (
                <text key={p.axis} x={p.labelX} y={p.labelY} textAnchor={p.anchor} fill="#e5e7eb" fillOpacity={gap ? 0.5 : 1} fontSize={9}>
                  {t(`person.octagon.axes.${p.axis}`)}
                </text>
              );
            })}
          </svg>
          {inView(active) ? <VertexTip vertex={active!} phases={phases} refs={refs} pinned={same(pinned, active)} /> : null}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {overlap ? (
            <ul className="flex flex-col gap-1.5">
              {shown.map(({ phase, color }) => (
                <li key={phase.label} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{nameOf(phase, t)}</span>
                    {phaseYears(phase) ? <span className="text-xs text-subtle tabular-nums"> · {phaseYears(phase)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : current ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">{nameOf(current, t)}</span>
              {phaseYears(current) ? <span className="text-xs text-subtle tabular-nums">{phaseYears(current)}</span> : null}
              {current.origin === 'generated' ? <span className="text-xs leading-relaxed text-muted">{t('person.octagon.generated')}</span> : current.summary ? <span className="text-xs leading-relaxed text-muted">{current.summary}</span> : null}
              {Object.keys(current.axes).length < 3 ? (
                <span className="text-xs leading-relaxed text-subtle">{t('person.octagon.sparse', { count: Object.keys(current.axes).length })}</span>
              ) : null}
            </div>
          ) : null}
          <p className="text-[11px] leading-snug text-subtle">{t('person.octagon.noTotal')}</p>
        </div>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer list-none text-link hover:underline [&::-webkit-details-marker]:hidden">{t('person.octagon.table')}</summary>
        {overlap ? <OverlapTable phases={phases} /> : current ? <PhaseTable phase={current} refs={refs} /> : null}
      </details>
    </div>
  );
}

// The overlap view's numbers: every phase's score for each axis side by side.
function OverlapTable({ phases }: { phases: PersonPhase[] }) {
  const t = useT();
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[22rem] border-separate border-spacing-0 text-start">
        <thead>
          <tr>
            <th scope="col" className="py-1 pe-3 text-start font-normal text-subtle" />
            {phases.map((p, i) => (
              <th key={p.label} scope="col" className="px-2 py-1 text-end font-medium text-ink">
                <span className="me-1 inline-block size-2 rounded-full align-middle" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
                {nameOf(p, t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OCTAGON_AXES.map((axis) => (
            <tr key={axis}>
              <th scope="row" className="border-t border-line py-1 pe-3 text-start font-medium text-ink">
                <span className="me-1.5 text-[10px] text-subtle tabular-nums">{String(OCTAGON_AXES.indexOf(axis) + 1).padStart(2, '0')}</span>
                {t(`person.octagon.axes.${axis}`)}
              </th>
              {phases.map((p) => (
                <td key={p.label} className="border-t border-line px-2 py-1 text-end tabular-nums text-muted">
                  {p.axes[axis] ? p.axes[axis]!.score : '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] leading-snug text-subtle">{t('person.octagon.overlapNote')}</p>
    </div>
  );
}

// The confidence label as a pill, tinted like the pin confidence badges.
const CONFIDENCE_PILL: Record<string, string> = {
  high: 'bg-emerald-500/15 text-success-soft ring-emerald-500/30',
  medium: 'bg-sky-500/15 text-info-soft ring-sky-500/30',
  low: 'bg-amber-500/15 text-warning-soft ring-amber-500/30',
};

// One phase's table: each axis with its score, rubric, confidence and source.
function PhaseTable({ phase, refs }: { phase: PersonPhase; refs: Record<string, number> }) {
  const t = useT();
  return (
    <dl className="mt-2 flex flex-col gap-2">
      {OCTAGON_AXES.map((axis) => {
        const a = phase.axes[axis];
        const href = safeUrl(a?.evidenceUrl);
        const n = a ? refs[a.evidenceUrl] : undefined;
        return (
          <div key={axis} className="flex flex-col gap-0.5">
            <dt className="flex items-baseline justify-between gap-2 text-ink">
              <span className="font-medium">
                <span className="me-1.5 text-[10px] text-subtle tabular-nums">{String(OCTAGON_AXES.indexOf(axis) + 1).padStart(2, '0')}</span>
                {t(`person.octagon.axes.${axis}`)}
              </span>
              <span className="tabular-nums">{a ? t('person.octagon.score', { score: a.score }) : t('person.octagon.gap')}</span>
            </dt>
            <dd className="text-subtle">
              {a ? (
                <>
                  <span
                    className={`me-1.5 inline-flex items-center rounded-full px-2 py-px align-middle text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${CONFIDENCE_PILL[a.confidence] ?? 'bg-tint/5 text-muted ring-tint/10'}`}
                  >
                    {t.dynamic(`person.impactConfidence.${a.confidence}`, a.confidence)}
                  </span>
                  {a.basis ?? ''}
                  {href && n ? (
                    <sup className="ms-0.5 text-[10px] font-medium">
                      <Anchor href={`#source-${n}`} className="text-link hover:underline">
                        [{n}]
                      </Anchor>
                    </sup>
                  ) : null}
                </>
              ) : null}
              <span className="block text-[11px] leading-snug opacity-80">{t(`person.octagon.rubric.${axis}`)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// The value of one vertex: which phase and axis, its score, how sure the
// evidence is, and what it rests on. It follows the pointer's vertex; once
// pinned by a click it can be reached, and carries its source.
function VertexTip({ vertex, phases, refs, pinned }: { vertex: Vertex; phases: PersonPhase[]; refs: Record<string, number>; pinned: boolean }) {
  const t = useT();
  const phase = phases[vertex.phase];
  const a = phase.axes[vertex.axis];
  if (!a) return null;
  const at = octagonPoints(phase.axes, SIZE, RADIUS).find((p) => p.axis === vertex.axis)!;
  const left = Math.min(80, Math.max(20, ((at.x + PAD) / (SIZE + PAD * 2)) * 100));
  const top = ((at.y + 4) / (SIZE + 8)) * 100;
  const below = top < 40;
  const n = refs[a.evidenceUrl];
  const href = safeUrl(a.evidenceUrl);
  return (
    <div
      role="status"
      onClick={(e) => e.stopPropagation()}
      className={`${pinned ? 'pointer-events-auto' : 'pointer-events-none'} absolute z-10 w-60 max-w-[78%] rounded-lg bg-[#0f172a]/95 px-3 py-2.5 text-start text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm`}
      style={{ left: `${left}%`, top: `${top}%`, transform: below ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 14px))' }}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-white/70">
        <span className="size-2 rounded-full" style={{ background: CHART_COLORS[vertex.phase % CHART_COLORS.length] }} aria-hidden />
        <span className="truncate">{nameOf(phase, t)}</span>
        {phaseYears(phase) ? <span className="tabular-nums">· {phaseYears(phase)}</span> : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{t(`person.octagon.axes.${vertex.axis}`)}</span>
        <span className="text-sm font-semibold tabular-nums">{t('person.octagon.score', { score: a.score })}</span>
      </div>
      <div className="text-[11px] text-white/70">{t.dynamic(`person.impactConfidence.${a.confidence}`, a.confidence)}</div>
      {a.basis ? <p className="mt-1.5 text-[11px] leading-snug text-white/85">{a.basis}</p> : null}
      {href ? (
        <p className="mt-1.5 text-[11px] text-white/60">
          {n ? (
            <Anchor href={`#source-${n}`} className="text-sky-300 hover:underline">
              [{n}]
            </Anchor>
          ) : null}{' '}
          {pinned ? <Anchor href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">{new URL(href).hostname.replace(/^www\./, '')}</Anchor> : null}
        </p>
      ) : null}
    </div>
  );
}
