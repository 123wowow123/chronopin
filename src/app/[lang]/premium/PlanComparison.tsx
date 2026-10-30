import { getT } from '@/lib/i18n/server';

// Free versus the paid plans, side by side. Plain server markup: the prices
// mirror src/server/stripe.ts (USD; the yuan prices show on the buy buttons).
const ROWS = [
  { key: 'rowBrowse', plans: [true, true, true, true] },
  { key: 'rowAds', plans: [false, true, false, true] },
  { key: 'rowMoves', plans: [false, false, true, true] },
  { key: 'rowPnl', plans: [false, false, true, true] },
  { key: 'rowAlerts', plans: [false, false, true, true] },
] as const;

export async function PlanComparison() {
  const t = await getT();
  const plans = [
    [t('premium.planFree'), t('premium.priceFree')],
    [t('premium.planAdFree'), t('premium.priceAdFree')],
    [t('premium.planPremium'), t('premium.pricePremium')],
    [t('premium.planBundle'), t('premium.priceBundle')],
  ];
  return (
    <section className="mb-10 overflow-x-auto pb-1">
      <h2 className="mb-4 text-center font-display text-2xl font-semibold tracking-tight">{t('premium.compareTitle')}</h2>
      <table className="surface w-full min-w-[36rem] border-separate border-spacing-0 overflow-hidden rounded-2xl text-sm">
        <thead>
          <tr>
            <td className="p-4" />
            {plans.map(([name, price], i) => (
              <th key={name} scope="col" className={`px-3 py-5 text-center align-bottom font-semibold ${i === 3 ? 'rounded-t-xl bg-accent text-white' : ''}`}>
                <span className="block text-base">{name}</span>
                {i === 0 ? null : <span className={`mt-1 block text-xs font-medium ${i === 3 ? 'text-white/85' : 'text-muted'}`}>{price}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, r) => (
            <tr key={row.key}>
              <th scope="row" className="border-t border-line p-4 text-left font-normal">{t(`premium.${row.key}`)}</th>
              {row.plans.map((has, i) => (
                <td
                  key={i}
                  className={`border-t p-4 text-center text-lg ${i === 3 ? `border-accent/20 bg-accent/10 ${r === ROWS.length - 1 ? 'rounded-b-xl' : ''}` : 'border-line'} ${has ? 'font-semibold text-success' : 'text-subtle'}`}
                >
                  <span aria-hidden="true">{has ? '✓' : '–'}</span>
                  <span className="sr-only">{has ? t('premium.included') : t('premium.notIncluded')}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
