import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { VIDEO_PERF_AXES, VIDEO_PERF_KEYS, VIDEO_PERF_MAX, hasVideoPerf, type PinVideoPerfJson } from '@/lib/pinVideoPerf';
import { Cite } from './PinTaste';
import { ReviewList } from './ReviewList';
import { TasteRadar } from './TasteRadar';

// An AI video model pin's rubric as a radar (PinVideoPerf, 0212), drawn by the
// taste radar's chart as the car rubrics are (./PinCarPerf). The words are English, as the /cars page's are; the axes
// have no search term, so their labels are plain text.
export function PinVideoPerf({ perf, t, locale, evidence, className = '' }: { perf: PinVideoPerfJson; t: Translator; locale: string; evidence: Evidence[]; className?: string }) {
  if (!hasVideoPerf(perf)) return null;
  const labels = Object.fromEntries(VIDEO_PERF_AXES.map((axis) => [axis.key, axis.label]));
  const summary = VIDEO_PERF_KEYS.map((key) => `${labels[key]} ${perf[key] == null ? 'n/a' : `${perf[key]}/${VIDEO_PERF_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label="Video model rubric">
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase">
        Video model rubric
        <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] normal-case">{perf.rubricYear} criteria</span>
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar scores={perf} labels={labels} summary={`Video model rubric: ${summary}`} showJa={false} axes={VIDEO_PERF_AXES} max={VIDEO_PERF_MAX} naLabel="n/a" height={312} linkLabels={false} />
        <p className="text-xs text-muted">
          Estimate from the version&apos;s published specs and reviews, 0-{VIDEO_PERF_MAX}; scores are only comparable within one criteria year.
          {perf.basis ? ` ${perf.basis}` : ''}
          {perf.sourceUrl ? <Cite url={perf.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={perf.reviews} heading="Reviews" locale={locale} />
      </div>
    </section>
  );
}
