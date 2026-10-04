'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useIntlLocale, useT } from '@/lib/client/i18n';
import type { CompanyExecutive } from '@/lib/types';

// Whole pay in the page's own words: "$1,500,000" up to a million, "$27.1M"
// beyond it, in the currency the company reports in.
export function formatPay(locale: string, amount: number, currency: string): string {
  const compact = amount >= 10_000_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

// The company's C-suite, one row per chief officer: name and title, then the
// base salary and total compensation for the fiscal year the company reported
// them in, with the filing they come from. A private company publishes no
// pay, so its rows say "not disclosed". Nothing until someone is listed.
export function CompanyExecutivesPanel({ name, executives }: { name: string; executives: CompanyExecutive[] }) {
  const t = useT();
  const locale = useIntlLocale();
  const [explaining, setExplaining] = useState(false);
  const id = useId();
  if (!executives.length) return null;
  return (
    <section aria-labelledby={`${id}-h`} className="floating flex flex-col gap-2 px-4 py-3.5">
      <h2 id={`${id}-h`} className="flex items-center gap-1 text-sm font-semibold text-ink">
        {t('company.executives')}
        <button
          type="button"
          onClick={() => setExplaining(!explaining)}
          aria-expanded={explaining}
          aria-controls={`${id}-about`}
          aria-label={t('company.executivesAboutLabel')}
          title={t('company.executivesAboutLabel')}
          className={`-my-1 rounded-full p-1 font-normal hover:bg-raised hover:text-ink ${explaining ? 'text-link' : 'text-subtle'}`}
        >
          <Icon name="info" className="size-3.5" />
        </button>
      </h2>
      {explaining ? (
        <p id={`${id}-about`} className="rounded-lg border border-line bg-raised/40 px-3 py-2.5 text-xs leading-relaxed text-muted">
          {t('company.executivesAbout', { name })}
        </p>
      ) : null}
      <ul className="flex flex-col divide-y divide-line">
        {executives.map((e) => (
          <li key={e.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
            <span className="text-sm font-medium text-ink">{e.name}</span>
            <span className="text-xs text-muted">{e.title}</span>
            {e.salary != null || e.totalCompensation != null ? (
              <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
                <div>
                  <dt className="text-subtle">{t('company.executiveSalary')}</dt>
                  <dd className="font-medium text-ink tabular-nums">{e.salary != null ? formatPay(locale, e.salary, e.currency) : '–'}</dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('company.executiveTotal')}</dt>
                  <dd className="font-medium text-ink tabular-nums">{e.totalCompensation != null ? formatPay(locale, e.totalCompensation, e.currency) : '–'}</dd>
                </div>
              </dl>
            ) : (
              <span className="mt-1 text-xs text-subtle">{t('company.executiveUndisclosed')}</span>
            )}
            {e.fiscalYear || e.sourceUrl ? (
              <span className="text-[11px] text-subtle">
                {e.fiscalYear ? t('company.executiveFiscalYear', { year: String(e.fiscalYear) }) : null}
                {e.fiscalYear && e.sourceUrl ? ' · ' : null}
                {e.sourceUrl ? (
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-link hover:underline">
                    {t('company.executiveSource')}
                  </a>
                ) : null}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
