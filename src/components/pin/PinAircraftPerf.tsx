import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { AIRCRAFT_PERF_AXES, AIRCRAFT_PERF_KEYS, AIRCRAFT_PERF_MAX, hasAircraftPerf, type PinAircraftPerfJson } from '@/lib/pinAircraftPerf';
import { Cite } from './PinTaste';
import { ReviewList } from './ReviewList';
import { TasteRadar } from './TasteRadar';

// A gasoline car pin's performance rubric as a radar (PinAircraftPerf, 0173),
// drawn by the taste radar's chart as the electric rubric is
// (./PinCarPerf). The words are English, as the /cars page's are; the axes
// have no search term, so their labels are plain text.
export function PinAircraftPerf({ perf, t, locale, evidence, className = '' }: { perf: PinAircraftPerfJson; t: Translator; locale: string; evidence: Evidence[]; className?: string }) {
  if (!hasAircraftPerf(perf)) return null;
  const labels = Object.fromEntries(AIRCRAFT_PERF_AXES.map((axis) => [axis.key, axis.label]));
  const summary = AIRCRAFT_PERF_KEYS.map((key) => `${labels[key]} ${perf[key] == null ? 'n/a' : `${perf[key]}/${AIRCRAFT_PERF_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label="Aircraft rubric">
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase">
        Aircraft rubric
        <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] normal-case">{perf.rubricYear} criteria</span>
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar scores={perf} labels={labels} summary={`Aircraft rubric: ${summary}`} showJa={false} axes={AIRCRAFT_PERF_AXES} max={AIRCRAFT_PERF_MAX} naLabel="n/a" height={312} linkLabels={false} />
        <p className="text-xs text-muted">
          Estimate from the variant&apos;s published specs, 0-{AIRCRAFT_PERF_MAX}; scores are only comparable within one criteria year.
          {perf.basis ? ` ${perf.basis}` : ''}
          {perf.sourceUrl ? <Cite url={perf.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={perf.reviews} heading="Reviews" locale={locale} />
      </div>
    </section>
  );
}
