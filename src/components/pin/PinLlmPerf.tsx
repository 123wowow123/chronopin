import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { LLM_PERF_AXES, LLM_PERF_KEYS, LLM_PERF_MAX, hasLlmPerf, type PinLlmPerfJson } from '@/lib/pinLlmPerf';
import { Cite } from './PinTaste';
import { ReviewList } from './ReviewList';
import { TasteRadar } from './TasteRadar';

// A language model pin's rubric as a radar (PinLlmPerf, 0213), drawn by the
// taste radar's chart as the car rubrics are (./PinCarPerf). The words are English, as the /cars page's are; the axes
// have no search term, so their labels are plain text.
export function PinLlmPerf({ perf, t, locale, evidence, className = '' }: { perf: PinLlmPerfJson; t: Translator; locale: string; evidence: Evidence[]; className?: string }) {
  if (!hasLlmPerf(perf)) return null;
  const labels = Object.fromEntries(LLM_PERF_AXES.map((axis) => [axis.key, axis.label]));
  const summary = LLM_PERF_KEYS.map((key) => `${labels[key]} ${perf[key] == null ? 'n/a' : `${perf[key]}/${LLM_PERF_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label="Language model rubric">
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase">
        Language model rubric
        <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] normal-case">{perf.rubricYear} criteria</span>
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar scores={perf} labels={labels} summary={`Language model rubric: ${summary}`} showJa={false} axes={LLM_PERF_AXES} max={LLM_PERF_MAX} naLabel="n/a" height={312} linkLabels={false} />
        <p className="text-xs text-muted">
          Estimate from the version&apos;s published specs, benchmarks and reviews, 0-{LLM_PERF_MAX}; scores are only comparable within one criteria year.
          {perf.basis ? ` ${perf.basis}` : ''}
          {perf.sourceUrl ? <Cite url={perf.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={perf.reviews} heading="Reviews" locale={locale} />
      </div>
    </section>
  );
}
