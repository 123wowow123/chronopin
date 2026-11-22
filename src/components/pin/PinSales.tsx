import {
  formatSalesValue,
  type PinSalesJson,
  type SalesMetric,
} from "@/lib/sales";
import type { Translator } from "@/lib/i18n/translate";

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
                {group.map((row) => (
                  <li key={row.id} className="grid gap-1.5 px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-muted">
                        {row.period ?? (row.asOf ? date(row.asOf) : label)}
                      </span>
                      <span className="shrink-0 font-semibold text-ink tabular-nums">
                        {formatSalesValue(row, t.locale)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-raised"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.max(3, Math.round((row.value / max) * 100))}%`,
                        }}
                      />
                    </div>
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="w-fit text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                    >
                      {t("pin.sales.source")} ↗
                    </a>
                  </li>
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
