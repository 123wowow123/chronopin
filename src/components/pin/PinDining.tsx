import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { DINING_AXES, DINING_KEYS, DINING_MAX, hasDining, type DiningAxis, type PinDiningJson } from '@/lib/pinDining';
import { Cite } from './PinTaste';
import { RefineLink } from './RefineLink';
import { ReviewList } from './ReviewList';
import { TasteRadar } from './TasteRadar';

// A restaurant pin's dining rubric as a radar (PinDining, 0170), drawn by the
// taste radar's chart. The scores are an editorial estimate from the venue's
// published diner sub-scores and critic recognition and the section says so;
// an axis with no published figure is "n/a" at the centre and not part of the
// shape. The basis line says which figures drove each score, with the
// citation of the page they came from, and the independent reviews it was
// checked against are listed under it, as under the car performance radar.
export function PinDining({
  dining,
  t,
  locale,
  evidence,
  className = '',
}: {
  dining: PinDiningJson;
  t: Translator;
  locale: string;
  evidence: Evidence[];
  className?: string;
}) {
  if (!hasDining(dining)) return null;
  const labels = Object.fromEntries(DINING_AXES.map((axis) => [axis.key, t(`pin.dining.${axis.key}` as 'pin.dining.food')])) as Record<DiningAxis, string>;
  const na = t('pin.dining.na');
  const summary = DINING_KEYS.map((key) => `${labels[key]} ${dining[key] == null ? na : `${dining[key]}/${DINING_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.dining.heading')}>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        <RefineLink field="dining" value="any" className="text-inherit hover:text-link hover:no-underline" title={t('pin.dining.showAll')}>
          {t('pin.dining.heading')}
        </RefineLink>
      </h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar
          scores={dining}
          labels={labels}
          summary={`${t('pin.dining.heading')}: ${summary}`}
          showJa={false}
          axes={DINING_AXES}
          field="dining"
          max={DINING_MAX}
          naLabel={na}
          height={292}
        />
        <p className="text-xs text-muted">
          {t('pin.dining.note', { max: DINING_MAX })}
          {dining.basis ? ` ${dining.basis}` : ''}
          {dining.sourceUrl ? <Cite url={dining.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={dining.reviews} heading={t('pin.dining.reviews')} locale={locale} />
      </div>
    </section>
  );
}
