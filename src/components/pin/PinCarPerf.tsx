import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { CAR_PERF_AXES, CAR_PERF_KEYS, CAR_PERF_MAX, hasCarPerf, type CarPerfAxis, type PinCarPerfJson } from '@/lib/pinCarPerf';
import { Cite } from './PinTaste';
import { RefineLink } from './RefineLink';
import { ReviewList } from './ReviewList';
import { RubricYearPill } from './RubricYearPill';
import { TasteRadar } from './TasteRadar';

// A vehicle pin's car performance rubric as a radar (PinCarPerf, 0167), drawn
// by the taste radar's chart. The scores are an editorial estimate from the
// model's published specs and the section says so; an axis whose spec is not
// published is "n/a" at the centre and not part of the shape. The basis line
// says which variant was scored and what drove each score, with the citation
// of the page the figures came from, and the independent reviews it was
// checked against are listed under it, as under the taste radar. The header
// also says which year's criteria the scores were set against (rubricYear):
// the anchors get tighter, so scores are only comparable within a year.
export function PinCarPerf({
  perf,
  t,
  locale,
  evidence,
  className = '',
}: {
  perf: PinCarPerfJson;
  t: Translator;
  locale: string;
  evidence: Evidence[];
  className?: string;
}) {
  if (!hasCarPerf(perf)) return null;
  const labels = Object.fromEntries(CAR_PERF_AXES.map((axis) => [axis.key, t(`pin.carPerf.${axis.key}` as 'pin.carPerf.range')])) as Record<CarPerfAxis, string>;
  const na = t('pin.carPerf.na');
  const year = String(perf.rubricYear);
  const summary = CAR_PERF_KEYS.map((key) => `${labels[key]} ${perf[key] == null ? na : `${perf[key]}/${CAR_PERF_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.carPerf.heading')}>
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <RefineLink field="carperf" value="any" className="text-inherit hover:text-link hover:no-underline" title={t('pin.carPerf.showAll')}>
          {t('pin.carPerf.heading')}
        </RefineLink>
        <span className="rounded-full bg-raised px-2 py-px text-[0.625rem] font-medium tracking-wide text-muted ring-1 ring-line ring-inset">{t('pin.carPerf.estimate')}</span>
        <RubricYearPill label={t('pin.carPerf.rubricYear', { year })} />
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar
          scores={perf}
          labels={labels}
          summary={`${t('pin.carPerf.heading')}: ${summary}`}
          showJa={false}
          axes={CAR_PERF_AXES}
          field="carperf"
          max={CAR_PERF_MAX}
          naLabel={na}
          height={312}
        />
        <p className="text-xs text-muted">
          {t('pin.carPerf.note', { max: CAR_PERF_MAX })} {t('pin.carPerf.rubricYearNote', { year })}
          {perf.basis ? ` ${perf.basis}` : ''}
          {perf.sourceUrl ? <Cite url={perf.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={perf.reviews} heading={t('pin.carPerf.reviews')} locale={locale} />
      </div>
    </section>
  );
}
