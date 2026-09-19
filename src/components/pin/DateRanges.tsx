'use client';

import { useT } from '@/lib/client/i18n';
import { type DateClaim, type DateRange, isLowConfidence } from '@/lib/dateClaims';
import { dateFormat, dayKeyParts, dayKeyToMs } from '@/lib/format';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { confidenceClass } from './PinConfidence';

const dayFormat = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// "Jan 1, 2027"; "Jan 1, 2561 BC" for a day key before the common era, which
// Intl prints as plain "2561".
export const formatDay = (ymd: string, locale: Locale = 'en') =>
  dayFormat(locale).format(dayKeyToMs(ymd)) + (dayKeyParts(ymd)[0] <= 0 ? (locale === 'en' ? ' BC' : ` (${dateFormat(INTL_LOCALES[locale], { era: 'short', timeZone: 'UTC' }).formatToParts(dayKeyToMs(ymd)).find((p) => p.type === 'era')?.value ?? 'BC'})`) : '');

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function whose(claim: DateClaim, t: Translator) {
  const by = claim.isSource ? t('dateRanges.theSource') : hostname(claim.url || '');
  return claim.confidence == null ? by : `${by}, ${claim.confidence}%`;
}

// The best claim's day, its confidence and who gives it, then "possible Mar 1 –
// Jun 5, 2027" when the claims disagree.
function Range({ label, range }: { label: string; range: DateRange }) {
  const t = useT();
  const { locale } = t;
  const { best } = range;
  const spread = range.earliest !== range.latest;
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5" title={range.claims.map((c) => `${formatDay(c.day, locale)} (${whose(c, t)})${c.used ? ` - ${t('dateRanges.used')}` : ''}`).join('\n')}>
        <span className="font-medium text-muted tabular-nums">{formatDay(best.day, locale)}</span>
        {best.confidence != null ? (
          <span
            className={`rounded-full px-2 py-px text-[10px] font-semibold tracking-wider tabular-nums ring-1 ring-inset ${confidenceClass(best.confidence)}`}
            title={range.claims.length > 1 ? t('dateRanges.mostConfident', { count: range.claims.length }) : t('dateRanges.onlySource')}
          >
            {t('confidence.badge', { percent: best.confidence })}
          </span>
        ) : null}
        {isLowConfidence(best.confidence) ? (
          <span className="font-medium text-warning-soft" title={t('dateRanges.lowConfidenceTitle')}>
            {t('dateRanges.lowConfidence')}
          </span>
        ) : null}
        <span className="text-subtle">
          {t('dateRanges.from', { who: best.isSource ? t('dateRanges.theSource') : hostname(best.url || '') })}
          {spread ? <> · {t('dateRanges.possible', { range: dayFormat(locale).formatRange(dayKeyToMs(range.earliest), dayKeyToMs(range.latest)) })}</> : null}
        </span>
      </dd>
    </>
  );
}

// The pin's start and end, each as the most confident claim among its source
// and references, with the range they all give.
export function DateRanges({ start, end }: { start?: DateRange; end?: DateRange }) {
  const t = useT();
  if (!start && !end) {
    return null;
  }
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-xs">
      {start ? <Range label={t('dateRanges.start')} range={start} /> : null}
      {end ? <Range label={t('dateRanges.end')} range={end} /> : null}
    </dl>
  );
}
