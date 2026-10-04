'use client';

import { useT } from '@/lib/client/i18n';
import { orderEvidence } from '@/lib/citations';
import type { DateClaim, DateRange } from '@/lib/dateClaims';
import { dateFormat, dayKeyParts, dayKeyToMs } from '@/lib/format';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import type { Evidence } from '@/lib/referenceConfidence';
import type { Translator } from '@/lib/i18n/translate';
import { ConfidenceBadge, confidenceClass } from './PinConfidence';

const dayFormat = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// "Mar 13 – 14, 2026". Node and the browser ship different ICU data: Node puts
// thin spaces (U+2009) around the dash and Chrome plain ones, so the same range
// rendered on the server and again on hydration did not match. Plain spaces
// either way.
export const formatDayRange = (from: string, to: string, locale: Locale = 'en') =>
  dayFormat(locale).formatRange(dayKeyToMs(from), dayKeyToMs(to)).replace(/[\u2009\u202f]/g, ' ');

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

// The References panel row (ref-n) a claim comes from, numbered as that panel
// numbers its rows; none when the claim's source is not listed there.
function refIdOf(claim: DateClaim, linked: Evidence[]) {
  const index = linked.findIndex((e) => (claim.isSource ? e.isSource : !e.isSource && e.url === claim.url));
  return index < 0 ? undefined : `ref-${index + 1}`;
}

// The best claim's day, its confidence and who gives it, then "possible Mar 1 –
// Jun 5, 2027" when the claims disagree.
function Range({ label, range, linked }: { label: string; range: DateRange; linked: Evidence[] }) {
  const t = useT();
  const { locale } = t;
  const { best } = range;
  const spread = range.earliest !== range.latest;
  const from = t('dateRanges.from', { who: best.isSource ? t('dateRanges.theSource') : hostname(best.url || '') });
  const refId = refIdOf(best, linked);
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5" title={range.claims.map((c) => `${formatDay(c.day, locale)} (${whose(c, t)})${c.used ? ` - ${t('dateRanges.used')}` : ''}`).join('\n')}>
        <span className="font-medium text-muted tabular-nums">{formatDay(best.day, locale)}</span>
        {best.confidence != null ? (
          <ConfidenceBadge
            confidence={best.confidence}
            className={confidenceClass(best.confidence)}
            title={range.claims.length > 1 ? t(best.later ? 'dateRanges.newest' : 'dateRanges.mostConfident', { count: range.claims.length }) : t('dateRanges.onlySource')}
          >
            {t('confidence.badge', { percent: best.confidence })}
          </ConfidenceBadge>
        ) : null}
        <span className="text-subtle">
          {refId ? (
            <a href={`#${refId}`} className="hover:underline hover:decoration-dotted hover:underline-offset-2">
              {from}
            </a>
          ) : (
            from
          )}
          {spread ? <> · {t('dateRanges.possible', { range: formatDayRange(range.earliest, range.latest, locale) })}</> : null}
        </span>
      </dd>
    </>
  );
}

// The pin's start and end, each as the most confident claim among its source
// and references, with the range they all give. "from ..." links to that
// source's row in the References panel.
export function DateRanges({ start, end, evidence = [] }: { start?: DateRange; end?: DateRange; evidence?: Evidence[] }) {
  const t = useT();
  const linked = orderEvidence(evidence);
  if (!start && !end) {
    return null;
  }
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-xs">
      {start ? <Range label={t('dateRanges.start')} range={start} linked={linked} /> : null}
      {end ? <Range label={t('dateRanges.end')} range={end} linked={linked} /> : null}
    </dl>
  );
}
