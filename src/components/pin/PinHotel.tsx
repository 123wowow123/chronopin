import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { HOTEL_AXES, HOTEL_KEYS, HOTEL_MAX, hasHotel, type HotelAxis, type PinHotelJson } from '@/lib/pinHotel';
import type { PricePerNight } from '@/lib/travel';
import { Cite } from './PinTaste';
import { RefineLink } from './RefineLink';
import { ReviewList } from './ReviewList';
import { TasteRadar } from './TasteRadar';

// A hotel pin's hotel rubric as a radar (PinHotel, 0170), drawn by the
// taste radar's chart. The scores are an editorial estimate from the property's
// published diner sub-scores and critic recognition and the section says so;
// an axis with no published figure is "n/a" at the centre and not part of the
// shape. The basis line says which figures drove each score, with the
// citation of the page they came from, and the independent reviews it was
// checked against are listed under it, as under the car performance radar.
export function PinHotel({
  hotel,
  t,
  locale,
  evidence,
  pricePerNight,
  className = '',
}: {
  hotel: PinHotelJson;
  t: Translator;
  locale: string;
  evidence: Evidence[];
  pricePerNight?: PricePerNight;
  className?: string;
}) {
  if (!hasHotel(hotel)) return null;
  const labels = Object.fromEntries(HOTEL_AXES.map((axis) => [axis.key, t(`pin.hotel.${axis.key}` as 'pin.hotel.rooms')])) as Record<HotelAxis, string>;
  const na = t('pin.hotel.na');
  const summary = HOTEL_KEYS.map((key) => `${labels[key]} ${hotel[key] == null ? na : `${hotel[key]}/${HOTEL_MAX}`}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.hotel.heading')}>
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          <RefineLink field="hotel" value="any" className="text-inherit hover:text-link hover:no-underline" title={t('pin.hotel.showAll')}>
            {t('pin.hotel.heading')}
          </RefineLink>
        </h2>
        {pricePerNight ? (
          <span className="text-xs text-muted">
            <span className="font-semibold text-foreground tabular-nums">{pricePerNight.formatted}</span>
            <span className="text-[11px] text-muted"> / night</span>
          </span>
        ) : null}
      </div>
      <div className="surface rounded-lg px-3 py-2">
        {pricePerNight ? (
          <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-xs">
            <span className="text-muted">Estimated nightly rate</span>
            <span className="font-semibold text-foreground tabular-nums">
              {pricePerNight.formatted} <span className="font-normal text-muted">/ night</span>
            </span>
          </div>
        ) : null}
        <TasteRadar
          scores={hotel}
          labels={labels}
          summary={`${t('pin.hotel.heading')}: ${summary}`}
          showJa={false}
          axes={HOTEL_AXES}
          field="hotel"
          max={HOTEL_MAX}
          naLabel={na}
          height={292}
        />
        <p className="text-xs text-muted">
          {t('pin.hotel.note', { max: HOTEL_MAX })}
          {hotel.basis ? ` ${hotel.basis}` : ''}
          {hotel.sourceUrl ? <Cite url={hotel.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        <ReviewList reviews={hotel.reviews} heading={t('pin.hotel.reviews')} locale={locale} />
      </div>
    </section>
  );
}
