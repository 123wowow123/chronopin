import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { GAME_PERF_AXES, GAME_PERF_KEYS, GAME_PERF_MAX, hasGamePerf, type PinGamePerfJson } from '@/lib/pinGamePerf';
import { Cite } from './PinTaste';
import { TasteRadar } from './TasteRadar';

// A video game pin's rubric as a radar (PinGamePerf, 0229), drawn by the taste
// radar's chart as the car rubrics are. The scores are relative to the game's
// release year, which the pill shows ("1995 standards"). The words are
// English, as the car rubric's are; the axes have no search term.
export function PinGamePerf({ perf, t, evidence, className = '' }: { perf: PinGamePerfJson; t: Translator; evidence: Evidence[]; className?: string }) {
  if (!hasGamePerf(perf)) return null;
  const labels = Object.fromEntries(GAME_PERF_AXES.map((axis) => [axis.key, axis.label]));
  const summary = GAME_PERF_KEYS.map((key) => `${labels[key]} ${perf[key] == null ? 'n/a' : `${perf[key]}/${GAME_PERF_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label="Game rubric">
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase">
        Game rubric
        <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] normal-case">{perf.rubricYear} standards</span>
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar scores={perf} labels={labels} summary={`Game rubric: ${summary}`} showJa={false} axes={GAME_PERF_AXES} max={GAME_PERF_MAX} naLabel="n/a" height={312} linkLabels={false} />
        <p className="text-xs text-muted">
          Estimate from critic reviews, 0-{GAME_PERF_MAX}, judged against {perf.rubricYear} standards: a 5 means best of its era, so scores are only comparable between games of the same year.
          {perf.basis ? ` ${perf.basis}` : ''}
          {perf.sourceUrl ? <Cite url={perf.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
      </div>
    </section>
  );
}
