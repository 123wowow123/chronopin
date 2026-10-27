import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useIntlLocale, useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';
import { formatMonthRange, type BestTimeToGo } from '@/lib/travel';

export function BestTimeToGoWidget({
  timing,
  activeSeasonMonths,
  activeSeasonLabel,
  className = '',
}: {
  timing: BestTimeToGo;
  activeSeasonMonths?: readonly number[] | null;
  activeSeasonLabel?: string;
  className?: string;
}) {
  const t = useT();
  const gt = (key: string, values?: Record<string, string | number>) => t(`guides.travel.${key}` as MessageKey, values);
  const intl = useIntlLocale();
  const [expanded, setExpanded] = useState(false);
  const isPrimeInSeason =
    activeSeasonMonths && activeSeasonMonths.length < 12
      ? timing.recommendedMonths.some((m) => activeSeasonMonths.includes(m))
      : false;

  return (
    <div className={`mt-3 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-3 text-xs ${className}`}>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-[var(--soft)]">
          <Icon name="sun" className="size-3.5 text-amber-600" />
          <span>{gt('bestTimeToGo')}</span>
          <span className="font-bold text-[var(--text)]">
            {formatMonthRange(timing.recommendedMonths, intl, gt('yearRound'))}
          </span>
        </div>
        {isPrimeInSeason && activeSeasonLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf0cf] px-2.5 py-0.5 text-[10px] font-bold text-[#244d39] ring-1 ring-[#c8cfb4]">
            <span className="size-1.5 rounded-full bg-[#244d39]" />
            {gt('primeIn', { season: activeSeasonLabel })}
          </span>
        )}
      </div>

      {/* Season headline and climate summary */}
      <p className="mt-1 text-[11px] font-medium text-[var(--text)]">
        {timing.bestSeason} · <span className="tabular-nums font-semibold text-[var(--soft)]">{timing.tempRange}</span>
      </p>

      {/* 12-Month Mini Calendar Bar */}
      <div className="mt-2.5 grid grid-cols-12 gap-0.5 sm:gap-1 p-0.5" aria-label={gt('climateGuide')}>
        {timing.months.map((m) => {
          const isSeasonMonth = activeSeasonMonths && activeSeasonMonths.length < 12 ? activeSeasonMonths.includes(m.month) : false;
          const isPrime = m.status === 'prime';
          const isGood = m.status === 'good';

          let bgClass = 'bg-[var(--paper-raised)] text-[var(--soft)] opacity-60 border border-[var(--rule)]';
          if (isPrime) {
            bgClass = 'bg-[#244d39] text-[#fffef0] font-bold shadow-xs';
          } else if (isGood) {
            bgClass = 'bg-[#edf0cf] text-[#3b452b] font-semibold border border-[#d8dcd0]';
          }

          return (
            <div
              key={m.month}
              title={gt(m.highlight ? 'monthTipHighlight' : 'monthTip', { month: m.label, status: gt(`status.${m.status}`).toUpperCase(), temp: m.tempC, rain: gt(`rain.${m.rainfall}`), highlight: m.highlight ?? '' })}
              className={`flex h-6 min-w-0 flex-col items-center justify-center rounded text-[10px] transition-all ${bgClass} ${
                isSeasonMonth ? 'ring-2 ring-[#244d39] ring-offset-1 ring-offset-[var(--paper,#f6f3eb)]' : ''
              }`}
            >
              <span>{m.label.slice(0, 1)}</span>
            </div>
          );
        })}
      </div>

      {/* Toggle button for deep climate & timing details */}
      <div className="mt-2.5 flex items-center justify-between border-t border-[var(--rule)] pt-2">
        <span className="text-[10px] text-[var(--soft)] font-medium">
          {timing.weatherSummary}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-2 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--green)] hover:underline cursor-pointer"
          aria-expanded={expanded}
        >
          <span>{expanded ? gt('less') : gt('whyTiming')}</span>
          <Icon name="chevron" className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Editorial Insight and Breakdown */}
      {expanded && (
        <div className="mt-2.5 space-y-2 border-t border-[var(--rule)] pt-2.5 text-[11px] leading-relaxed text-[var(--text)]">
          <p className="italic text-[var(--soft)]">
            &ldquo;{timing.whyGo}&rdquo;
          </p>

          <div className="grid grid-cols-1 gap-1.5 pt-1 text-[10px] sm:grid-cols-2">
            <div>
              <strong className="text-[var(--text)]">{gt('peakSeason')}</strong>{' '}
              <span className="text-[var(--soft)]">{timing.peakSeason}</span>
            </div>
            <div>
              <strong className="text-[var(--text)]">{gt('shoulderSeason')}</strong>{' '}
              <span className="text-[var(--soft)]">{timing.shoulderSeason}</span>
            </div>
            <div>
              <strong className="text-[var(--text)]">{gt('lowSeason')}</strong>{' '}
              <span className="text-[var(--soft)]">{timing.lowSeason}</span>
            </div>
            <div>
              <strong className="text-[var(--text)]">{gt('climateZone')}</strong>{' '}
              <span className="text-[var(--soft)]">{timing.climateZone}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
