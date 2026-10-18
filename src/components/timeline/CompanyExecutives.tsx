"use client";

import Anchor from '@/components/ui/Anchor';
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useIntlLocale, useT } from "@/lib/client/i18n";
import type { CompanyExecutive } from "@/lib/types";

// Whole pay in the page's own words: "$1,500,000" up to a million, "$27.1M"
// beyond it, in the currency the company reports in.
export function formatPay(
  locale: string,
  amount: number,
  currency: string,
): string {
  const compact = amount >= 10_000_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

// What the older years of the pay table add: the sum of every year shown and
// the span it covers, and, for a year with no stock awarded, when the last
// grant was. Companies that grant stock in big blocks (Amazon) look underpaid
// in the years between. Nothing for an estimated total or a one-year table.
export function payTrend(
  e: Pick<
    CompanyExecutive,
    | "fiscalYear"
    | "totalCompensation"
    | "stockAwards"
    | "estimated"
    | "payHistory"
  >,
) {
  const history = e.payHistory ?? [];
  if (
    e.estimated ||
    e.fiscalYear == null ||
    e.totalCompensation == null ||
    !history.length
  )
    return { multiYear: null, lastGrant: null };
  const total = history.reduce((sum, y) => sum + y.total, e.totalCompensation);
  const from = Math.min(...history.map((y) => y.year));
  const grant =
    e.stockAwards === 0
      ? history.find((y) => (y.stockAwards ?? 0) > 0)
      : undefined;
  return {
    multiYear: { total, from, to: e.fiscalYear },
    lastGrant: grant ? { year: grant.year, amount: grant.stockAwards! } : null,
  };
}

// The company's C-suite, one row per chief officer: name and title, then the
// base salary and total compensation for the fiscal year the company reported
// them in, with the filing they come from. A private company publishes no
// pay, so its rows say "not disclosed". Nothing until someone is listed.
export function CompanyExecutivesPanel({
  name,
  executives,
}: {
  name: string;
  executives: CompanyExecutive[];
}) {
  const t = useT();
  const locale = useIntlLocale();
  const [explaining, setExplaining] = useState(false);
  const id = useId();
  if (!executives.length) return null;
  return (
    <section
      aria-labelledby={`${id}-h`}
      className="floating flex flex-col gap-2 px-4 py-3.5"
    >
      <h2
        id={`${id}-h`}
        className="flex items-center gap-1 text-sm font-semibold text-ink"
      >
        {t("company.executives")}
        <button
          type="button"
          onClick={() => setExplaining(!explaining)}
          aria-expanded={explaining}
          aria-controls={`${id}-about`}
          aria-label={t("company.executivesAboutLabel")}
          title={t("company.executivesAboutLabel")}
          className={`-my-1 rounded-full p-1 font-normal hover:bg-raised hover:text-ink ${explaining ? "text-link" : "text-subtle"}`}
        >
          <Icon name="info" className="size-3.5" />
        </button>
      </h2>
      {explaining ? (
        <p
          id={`${id}-about`}
          className="rounded-lg border border-line bg-raised/40 px-3 py-2.5 text-xs leading-relaxed text-muted"
        >
          {t("company.executivesAbout", { name })}
        </p>
      ) : null}
      <ul className="flex flex-col divide-y divide-line">
        {executives.map((e) => {
          const trend = payTrend(e);
          return (
            <li
              key={e.name}
              className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0"
            >
              <span className="text-sm font-medium text-ink">{e.name}</span>
              <span className="text-xs text-muted">{e.title}</span>
              {e.salary != null || e.totalCompensation != null ? (
                <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
                  <div>
                    <dt className="text-subtle">
                      {t("company.executiveSalary")}
                    </dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {e.salary != null
                        ? formatPay(locale, e.salary, e.currency)
                        : "–"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-subtle">
                      {t("company.executiveTotal")}
                    </dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {e.totalCompensation != null
                        ? formatPay(locale, e.totalCompensation, e.currency)
                        : "–"}
                    </dd>
                    {e.estimated ? <EstimateTag note={e.estimateNote} /> : null}
                  </div>
                  {trend.multiYear ? (
                    <div className="col-span-2 mt-0.5">
                      <dt className="text-subtle">
                        {t("company.executiveMultiYear", {
                          from: String(trend.multiYear.from),
                          to: String(trend.multiYear.to),
                        })}
                      </dt>
                      <dd className="font-medium text-ink tabular-nums">
                        {formatPay(locale, trend.multiYear.total, e.currency)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <span className="mt-1 text-xs text-subtle">
                  {t("company.executiveUndisclosed")}
                </span>
              )}
              {trend.lastGrant ? (
                <span className="text-[11px] text-subtle">
                  {t("company.executiveLastGrant", {
                    year: String(trend.lastGrant.year),
                    amount: formatPay(
                      locale,
                      trend.lastGrant.amount,
                      e.currency,
                    ),
                  })}
                </span>
              ) : null}
              <Breakdown e={e} locale={locale} />
              {e.fiscalYear || e.sourceUrl ? (
                <span className="text-[11px] text-subtle">
                  {e.fiscalYear
                    ? t("company.executiveFiscalYear", {
                        year: String(e.fiscalYear),
                      })
                    : null}
                  {e.fiscalYear && e.sourceUrl ? " · " : null}
                  {e.sourceUrl ? (
                    <Anchor
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link hover:underline"
                    >
                      {t("company.executiveSource")}
                    </Anchor>
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// "Estimate" beside a total that is the company's own estimate, not an amount
// paid, with an info toggle that says why (the note comes with the data).
function EstimateTag({ note }: { note: string | null | undefined }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="col-span-2 mt-0.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-ink ring-1 ring-inset ring-line">
        {t("company.executiveEstimate")}
        {note ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={t("company.executiveEstimateWhy")}
            title={note}
            className={`-me-1 rounded-full p-0.5 hover:text-ink ${open ? "text-link" : "text-subtle"}`}
          >
            <Icon name="info" className="size-3" />
          </button>
        ) : null}
      </span>
      {open && note ? (
        <p
          id={id}
          className="mt-1 rounded-lg border border-line bg-raised/40 px-2.5 py-2 text-[11px] leading-relaxed text-muted"
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

const FORMS = [
  ["bonus", "company.executiveBonus"],
  ["stockAwards", "company.executiveStock"],
  ["optionAwards", "company.executiveOptions"],
  ["incentivePay", "company.executiveIncentive"],
  ["pensionChange", "company.executivePension"],
  ["otherCompensation", "company.executiveOther"],
] as const;

// What the total is made of: the salary and each other form of pay the filing
// shows (a dash is left out), as a fold-out under the figures. Nothing when
// the filing's columns could not be read to add up to the total.
function Breakdown({ e, locale }: { e: CompanyExecutive; locale: string }) {
  const t = useT();
  const parts = FORMS.filter(([key]) => (e[key] ?? 0) > 0);
  if (!parts.length) return null;
  return (
    <details className="group mt-0.5 text-xs">
      <summary className="cursor-pointer list-none text-link hover:underline [&::-webkit-details-marker]:hidden">
        {t("company.executiveBreakdown")}
      </summary>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        {e.salary ? (
          <>
            <dt className="text-subtle">{t("company.executiveSalary")}</dt>
            <dd className="text-end text-ink tabular-nums">
              {formatPay(locale, e.salary, e.currency)}
            </dd>
          </>
        ) : null}
        {parts.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="text-subtle">{t(label)}</dt>
            <dd className="text-end text-ink tabular-nums">
              {formatPay(locale, e[key]!, e.currency)}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
