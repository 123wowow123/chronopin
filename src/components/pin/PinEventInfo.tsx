import { Icon } from '@/components/ui/Icon';
import type { PinEventInfoJson } from '@/lib/eventInfo';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';

// Who performs at an event pin and how to get in (PinEventInfo, 0082): the
// same facts its Event markup gives search, shown where a reader can see
// them. A sale state is a reading that goes stale, so it says when it was
// read, and is dropped once the event has started.
export function PinEventInfo({ info, started, t }: { info: PinEventInfoJson; started: boolean; t: Translator }) {
  const locale = INTL_LOCALES[t.locale] ?? 'en-US';
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
  // A ticket price in full ("$2,499", not the "$2.5K" figures elsewhere get),
  // with cents only when it has them.
  const amount = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: info.priceCurrency ?? 'USD',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  const free = info.lowPrice === 0 && (info.highPrice ?? 0) === 0;
  const price =
    info.lowPrice == null
      ? null
      : free
        ? t('pin.ticketsFree')
        : info.highPrice != null && info.highPrice > info.lowPrice
          ? `${amount(info.lowPrice)}–${amount(info.highPrice)}`
          : amount(info.lowPrice);
  const sale = started
    ? null
    : info.availability === 'SoldOut'
      ? t('pin.ticketsSoldOut')
      : info.availability === 'PreOrder'
        ? info.onSaleDate
          ? t('pin.ticketsOnSaleFrom', { date: day(info.onSaleDate) })
          : t('pin.ticketsNotYetOnSale')
        : info.availability === 'InStock' && !free
          ? t('pin.ticketsOnSale')
          : null;
  const hasTickets = !!(price || sale || (info.ticketUrl && !started));
  if (!info.performers.length && !hasTickets) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {info.performers.length ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="mr-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.performersHeading')}</span>
          {info.performers.map((performer, index) => (
            <span key={`${performer.name}-${index}`}>
              {performer.url ? (
                <a href={performer.url} target="_blank" rel="noopener nofollow">
                  {performer.name}
                </a>
              ) : (
                performer.name
              )}
              {index < info.performers.length - 1 ? ',' : ''}
            </span>
          ))}
        </div>
      ) : null}
      {hasTickets ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.ticketsHeading')}</span>
          {price ? <span className="font-semibold tabular-nums">{price}</span> : null}
          {sale ? (
            <span className={info.availability === 'SoldOut' ? 'text-danger' : 'text-subtle'}>
              {sale} <span className="text-xs">({t('pin.ticketsCheckedAt', { date: day(info.checkedAt) })})</span>
            </span>
          ) : null}
          {info.ticketUrl && !started && info.availability !== 'SoldOut' ? (
            <a href={info.ticketUrl} target="_blank" rel="noopener nofollow" className="btn btn-secondary">
              <Icon name="external" className="size-3.5 shrink-0 opacity-70" />
              {t('pin.getTickets')}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
