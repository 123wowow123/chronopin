import {
  formatSalesValue,
  SALES_UNKNOWN_COLOR,
  SALES_YEAR_COLORS,
  yearSegments,
  type PinSalesJson,
  type SalesMetric,
} from "@/lib/sales";
import type { Translator } from "@/lib/i18n/translate";
import { PinSalesBar } from "./PinSalesBar";

// A product pin's published sales figures (PinSales, 0267): per metric, the
// newest figure large, then every figure as a bar scaled to the largest, each
// with the page it was read from.
export function PinSales({
  rows,
  t,
  className = "",
}: {
  rows: PinSalesJson[];
  t: Translator;
  className?: string;
}) {
  if (!rows.length) return null;
  const date = (iso: string) =>
    new Intl.DateTimeFormat(t.locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  const metrics = [...new Set(rows.map((row) => row.metric))] as SalesMetric[];
  return (
    <section
      className={`grid gap-4 ${className}`}
      aria-label={t("pin.sales.heading")}
    >
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
        {t("pin.sales.heading")}
      </h2>
      {metrics.map((metric) => {
        const group = rows.filter((row) => row.metric === metric);
        const [latest] = group;
        const max = Math.max(...group.map((row) => row.value));
        // The newest life-to-date bar already splits into years, so the
        // older life-to-date snapshots only feed its segments.
        const newestToDate = group.find((row) =>
          /life to date/i.test(row.period ?? ""),
        );
        const shown = group.filter(
          (row) =>
            row === newestToDate || !/life to date/i.test(row.period ?? ""),
        );
        const years = [
          ...new Set(
            group.flatMap((row) =>
              (yearSegments(row, group) ?? [])
                .filter((s) => !s.unknown)
                .map((s) => s.year),
            ),
          ),
        ].sort((a, b) => a - b);
        const label =
          metric === "units" ? t("pin.sales.units") : t("pin.sales.revenue");
        return (
          <div key={metric} className="surface overflow-hidden rounded-xl">
            <div className="px-4 pt-4 pb-3">
              <span className="block text-3xl leading-none font-semibold tracking-tight text-ink tabular-nums">
                {formatSalesValue(latest, t.locale)}
              </span>
              <span className="mt-2 block text-sm text-ink/80">
                {label}
                {latest.scope ? ` · ${latest.scope}` : ""}
              </span>
              <span className="block text-xs text-muted">
                {[latest.period, latest.asOf ? date(latest.asOf) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {group.length > 1 ? (
              <ul className="divide-y divide-line border-t border-line text-sm">
                {shown.map((row) => (
                  <PinSalesBar
                    key={row.id}
                    label={row.period ?? (row.asOf ? date(row.asOf) : label)}
                    valueText={formatSalesValue(row, t.locale)}
                    widthPct={Math.max(3, Math.round((row.value / max) * 100))}
                    segments={(
                      yearSegments(row, group) ?? [
                        { year: 0, value: row.value },
                      ]
                    ).map((seg) => {
                      const amount = formatSalesValue(
                        { ...row, value: seg.value },
                        t.locale,
                      );
                      return {
                        key: String(seg.year),
                        label: seg.unknown
                          ? `${seg.year}–${seg.toYear}`
                          : seg.year
                            ? String(seg.year)
                            : "",
                        valueText: seg.unknown
                          ? `${amount} · ${t("pin.sales.unknown")}`
                          : amount,
                        pct: (seg.value / row.value) * 100,
                        color: seg.unknown
                          ? SALES_UNKNOWN_COLOR
                          : SALES_YEAR_COLORS[
                              Math.max(0, years.indexOf(seg.year)) %
                                SALES_YEAR_COLORS.length
                            ],
                      };
                    })}
                    sourceHref={row.sourceUrl}
                    sourceText={t("pin.sales.source")}
                  />
                ))}
              </ul>
            ) : (
              <a
                href={latest.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block border-t border-line px-4 py-2 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {t("pin.sales.source")} ↗
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}
