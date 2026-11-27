import Anchor from '@/components/ui/Anchor';
import { formatDayKey } from '@/lib/format';
import type { Translator } from '@/lib/i18n/translate';
import type { PinForecastJson } from '@/lib/pinForecast';
import { pinPath } from '@/lib/seo';

function Figure({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-24 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-subtle">{label}</span>
        <span className={`text-base font-semibold tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tint/10" role="img" aria-label={`${label} ${value}%`}>
        <div className={`h-full rounded-full ${accent ? 'bg-accent' : 'bg-muted'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// Chronopin's own call on a market-predicted pin (PinForecast, 0272), under the
// market odds: the daily jobs' reading of the question and of related pins on
// the site, set beside the market's figure so the gap is visible.
export function PinForecast({ forecast, t }: { forecast: PinForecastJson | null; t: Translator }) {
  if (!forecast) return null;
  const { probability, marketProbability, evidence } = forecast;
  return (
    <section aria-labelledby="forecast-heading" className="mb-4 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm">
      <h2 id="forecast-heading" className="text-[11px] font-semibold tracking-wider text-accent uppercase">
        {t('forecast.heading')}
      </h2>
      {/* The call and its reasoning are stored in English. */}
      <p lang="en" dir="ltr" className="mt-1 font-medium text-ink">
        {forecast.outcome}
      </p>
      {probability != null || marketProbability != null ? (
        <div className="mt-2 flex flex-wrap gap-4">
          {probability != null ? <Figure label={t('forecast.ours')} value={probability} accent /> : null}
          {marketProbability != null ? <Figure label={t('forecast.market')} value={marketProbability} /> : null}
        </div>
      ) : null}
      <p lang="en" dir="ltr" className="mt-2 text-muted">
        {forecast.reasoning}
      </p>
      {evidence.length ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-subtle">{t('forecast.basedOn')}</p>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {evidence.map((e) => (
              <li key={e.pinId} lang="en" dir="ltr" className="text-xs text-muted">
                <Anchor href={pinPath({ id: e.pinId, title: e.title ?? '' })}>{e.title}</Anchor>
                {` — ${e.note}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-subtle">
        {t('forecast.note')}
        {forecast.checkedAt ? ` ${t('forecast.updated', { date: formatDayKey(forecast.checkedAt.slice(0, 10), t.locale) })}` : ''}
      </p>
    </section>
  );
}
