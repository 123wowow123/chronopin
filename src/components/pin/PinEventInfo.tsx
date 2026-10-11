import Anchor from '@/components/ui/Anchor';
import { Icon } from '@/components/ui/Icon';
import { isTicketWordmark, TicketLogo } from '@/components/pin/TicketLogo';
import { ticketSeller, type PinEventInfoJson } from '@/lib/eventInfo';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';

// Who performs at an event pin and how to get in (PinEventInfo, 0082): the
// same facts its Event markup gives search, shown where a reader can see
// them. A sale state is a reading that goes stale, so it says when it was
// read, and is dropped once the event has started.
export function PinEventInfo({ info, started, t }: { info: PinEventInfoJson; started: boolean; t: Translator }) {
  const locale = INTL_LOCALES[t.locale] ?? 'en-US';
  const day = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(iso));
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
  // More than one named price: a table, in place of the span's range.
  const tiers = info.tiers?.length > 1 && info.lowPrice != null ? info.tiers : [];
  const hasTickets = !!(price || sale || (info.ticketUrl && !started));
  const seller = ticketSeller(info.ticketUrl);
  if (!info.performers.length && !hasTickets && !info.itinerary?.length) {
    return null;
  }

  const buyButton =
    info.ticketUrl && !started && info.availability !== 'SoldOut' ? (
      <Anchor
        href={info.ticketUrl}
        target="_blank"
        rel="noopener nofollow sponsored"
        className={`btn gap-1.5 ${seller ? 'border border-white/15 hover:brightness-110' : 'btn-secondary'}`}
        style={seller ? { backgroundColor: seller.background, color: seller.text } : undefined}
      >
        {seller ? (
          <TicketLogo seller={seller.label} className={isTicketWordmark(seller.label) ? 'h-3 w-auto shrink-0' : 'size-4 shrink-0'} />
        ) : (
          <Icon name="external" className="size-3.5 shrink-0 opacity-70" />
        )}
        {seller && isTicketWordmark(seller.label) ? <span className="sr-only">{seller.label}</span> : null}
        {t('pin.getTickets')}
        {seller ? <Icon name="external" className="size-3 shrink-0 opacity-60" /> : null}
      </Anchor>
    ) : null;
  const saleLine = sale ? (
    <span className={info.availability === 'SoldOut' ? 'text-danger' : 'text-subtle'}>
      {sale} <span className="text-xs">({t('pin.ticketsCheckedAt', { date: day(info.checkedAt) })})</span>
    </span>
  ) : null;

  // A price list: one panel, status and buy button on top, a row per tier.
  const tierPanel = tiers.length ? (
    <section className="w-full overflow-hidden rounded-xl border border-line bg-raised/40">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.ticketsHeading')}</span>
          {saleLine ? <div className="text-sm">{saleLine}</div> : null}
        </div>
        {buyButton}
      </div>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t('pin.ticketsHeading')}</caption>
        <tbody className="divide-y divide-line">
          {tiers.map((tier, index) => (
            <tr key={`${tier.label}-${index}`}>
              <th scope="row" className="px-4 py-2.5 text-start font-normal">
                {tier.label}
                {tier.note ? <span className="block text-xs text-subtle">{tier.note}</span> : null}
              </th>
              <td className={`px-4 py-2.5 text-end font-semibold tabular-nums ${tier.price === 0 ? 'text-success' : ''}`}>
                {tier.price === 0 ? t('pin.ticketsFree') : amount(tier.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ) : null;

  // What the ticket includes, a row a day: shown with the price, so a package
  // reads as what it buys.
  const itineraryPanel = info.itinerary?.length ? (
    <section className="w-full overflow-hidden rounded-xl border border-line bg-raised/40">
      <table className="w-full border-collapse text-sm">
        <caption className="border-b border-line px-4 py-3 text-start text-xs font-semibold tracking-wider text-subtle uppercase">
          {t.dynamic('pin.itineraryHeading', 'Itinerary')}
        </caption>
        <tbody className="divide-y divide-line">
          {info.itinerary.map((day, index) => (
            <tr key={`${day.label}-${index}`}>
              <th scope="row" className="w-1/3 px-4 py-2.5 text-start align-top font-semibold">
                {day.label}
              </th>
              <td className="px-4 py-2.5">
                <ul className="flex flex-col gap-1">
                  {day.items.map((item, i) => (
                    <li key={`${item}-${i}`}>{item}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ) : null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {info.performers.length ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.performersHeading')}</span>
          {info.performers.map((performer, index) => (
            <span key={`${performer.name}-${index}`}>
              {performer.url ? (
                <Anchor href={performer.url} target="_blank" rel="noopener nofollow">
                  {performer.name}
                </Anchor>
              ) : (
                performer.name
              )}
              {index < info.performers.length - 1 ? ',' : ''}
            </span>
          ))}
        </div>
      ) : null}
      {tierPanel}
      {hasTickets && !tiers.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.ticketsHeading')}</span>
          {price && !tiers.length ? <span className="font-semibold tabular-nums">{price}</span> : null}
          {saleLine}
          {buyButton}
        </div>
      ) : null}
      {itineraryPanel}
    </div>
  );
}
