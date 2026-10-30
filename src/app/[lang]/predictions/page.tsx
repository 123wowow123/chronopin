import type { Metadata } from 'next';
import { connection } from 'next/server';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { compactUsd, dateFormat } from '@/lib/format';
import { alternates, getLocale, getT } from '@/lib/i18n/server';
import { pinPath } from '@/lib/seo';
import type { AccuracySummary } from '@/lib/predictionAccuracy';
import { HISTORICAL_DAYS, predictionReport, type PredictionEntry } from '@/server/services/predictionRecords';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const links = await alternates('/predictions');
  const title = t('predictions.title');
  const description = t('predictions.description', { site: siteName });
  return { title, description, alternates: links, openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description } };
}

const OPEN_SHOWN = 60;
const SETTLED_SHOWN = 60;

export default async function PredictionsPage() {
  await connection();
  const [t, locale, report] = await Promise.all([getT(), getLocale(), predictionReport()]);
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const usd = compactUsd(locale);
  const day = (iso: string) => dateFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
  const settled = (basis: 'live' | 'historical') => report.entries.filter((e) => e.basis === basis && e.status !== 'open');
  const open = report.entries.filter((e) => e.status === 'open').sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

  const tiles = (summary: AccuracySummary, openCount?: number): [string, string][] => [
    [String(summary.markets), t('predictions.statSettled')],
    [summary.favoriteHitRate == null ? '–' : percent.format(summary.favoriteHitRate), t('predictions.statFavorite')],
    [summary.brier == null ? '–' : decimal.format(summary.brier), t('predictions.statBrier')],
    ...(openCount == null ? [] : [[String(openCount), t('predictions.statOpen')] as [string, string]]),
  ];

  function scoreboard(title: string, stats: [string, string][], lead?: string) {
    return (
      <section className="mb-10">
        <h2 className="mb-1 text-xl font-semibold">{title}</h2>
        {lead ? <p className="mb-4 text-sm text-muted">{lead}</p> : <div className="mb-4" />}
        <dl className={`grid grid-cols-2 gap-4 ${stats.length > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {stats.map(([value, label]) => (
            <div key={label} className="surface rounded-2xl p-5 text-center">
              <dd className="font-display text-4xl font-semibold tabular-nums">{value}</dd>
              <dt className="mt-1 text-xs text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  function calibration(summary: AccuracySummary) {
    if (!summary.buckets.length) return null;
    return (
      <section className="mb-12">
        <h3 className="mb-1 text-lg font-semibold">{t('predictions.calibrationTitle')}</h3>
        <p className="mb-4 text-sm text-muted">{t('predictions.calibrationLead')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-subtle">
              <th className="py-1 font-medium">{t('predictions.colSaid')}</th>
              <th className="py-1 font-medium">{t('predictions.colHappened')}</th>
              <th className="py-1 text-right font-medium">{t('predictions.colCount')}</th>
            </tr>
          </thead>
          <tbody>
            {summary.buckets.map((b) => (
              <tr key={b.from} className="border-t border-line">
                <td className="py-2 tabular-nums">{percent.format(b.from)}–{percent.format(b.to)}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative h-2 w-40 rounded-full bg-raised ring-1 ring-inset ring-line" role="img" aria-label={percent.format(b.hitRate)}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(b.hitRate * 100)}%` }} />
                      <div className="absolute top-[-3px] h-[14px] w-0.5 bg-ink" style={{ left: `${Math.round(b.meanProbability * 100)}%` }} />
                    </div>
                    <span className="tabular-nums">{percent.format(b.hitRate)}</span>
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-subtle">{t('predictions.calibrationKey')}</p>
      </section>
    );
  }

  function pinDate(e: PredictionEntry) {
    if (e.pinOriginalStart && e.pinOriginalStart !== e.pinStart.slice(0, 10)) return t('predictions.pinMoved', { date: day(`${e.pinOriginalStart}T00:00:00Z`) });
    return e.pinDateConfidence === 'confirmed' ? t('predictions.pinConfirmed') : t('predictions.pinPredicted');
  }

  function row(e: PredictionEntry) {
    const result =
      e.status === 'open' ? t('predictions.open') : e.status === 'void' ? t('predictions.void') : e.favoriteWon ? t('predictions.hit') : t('predictions.miss');
    const tone =
      e.status === 'resolved' ? (e.favoriteWon ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400') : 'text-muted';
    return (
      <li key={e.id} className="surface rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <Link href={pinPath({ id: e.pinId, title: e.pinTitle })} className="font-semibold hover:underline">{e.pinTitle}</Link>
          <span className={`text-sm font-semibold ${tone}`}>{result}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          <a href={e.marketUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.source}</a>: {e.question}
        </p>
        <p className="mt-2 text-sm">
          {e.favorite ? t('predictions.favorite', { label: e.favorite.label, chance: percent.format(e.favorite.probability) }) : null}
          {e.winner ? <> · {t('predictions.winner', { winner: e.winner })}</> : null}
        </p>
        <p className="mt-1 text-xs text-subtle">
          {e.basis === 'historical' ? t('predictions.historicalOdds', { days: HISTORICAL_DAYS, date: day(e.snapshotAt) }) : t('predictions.recordedOn', { date: day(e.snapshotAt) })}
          {e.resolvedAt ? ` · ${t('predictions.settledOn', { date: day(e.resolvedAt) })}` : ''}
          {e.volume ? ` · ${t('predictions.volume', { amount: usd.format(e.volume) })}` : ''}
          {` · ${pinDate(e)}`}
        </p>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-20 sm:px-6">
      <section className="mb-10 pt-6 text-center">
        <p className="mb-3 text-xs font-semibold tracking-wider text-accent uppercase">{t('predictions.eyebrow')}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t('predictions.heading')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{t('predictions.lead')}</p>
      </section>

      {scoreboard(t('predictions.liveTitle'), tiles(report.live, report.open))}
      <p className="-mt-6 mb-10 text-center text-xs text-subtle">{t('predictions.brierNote')}</p>
      {calibration(report.live)}
      <section className="mb-12">
        {settled('live').length ? (
          <ul className="grid gap-3">{settled('live').map(row)}</ul>
        ) : (
          <p className="surface rounded-2xl p-5 text-muted">{t('predictions.noneSettled')}</p>
        )}
      </section>

      {open.length ? (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">{t('predictions.openTitle')} · {open.length}</h2>
          <ul className="grid gap-3">{open.slice(0, OPEN_SHOWN).map(row)}</ul>
        </section>
      ) : null}

      {report.historical.markets ? (
        <>
          {scoreboard(t('predictions.historicalTitle'), tiles(report.historical), t('predictions.historicalLead', { days: HISTORICAL_DAYS }))}
          {calibration(report.historical)}
          <section className="mb-12">
            <ul className="grid gap-3">{settled('historical').slice(0, SETTLED_SHOWN).map(row)}</ul>
          </section>
        </>
      ) : null}

      <section className="mb-12">
        <h2 className="mb-2 text-xl font-semibold">{t('predictions.methodTitle')}</h2>
        <p className="text-sm text-muted">{t('predictions.methodText')}</p>
      </section>

      <section className="surface rounded-2xl p-6 text-center">
        <h2 className="mb-1 text-lg font-semibold">{t('predictions.premiumTitle')}</h2>
        <p className="mx-auto mb-4 max-w-xl text-sm text-muted">{t('predictions.premiumText')}</p>
        <Link href="/premium" className="inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">{t('predictions.premiumCta')}</Link>
      </section>
    </main>
  );
}
