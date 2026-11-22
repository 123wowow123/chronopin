import { formatSalesValue, type PinSalesJson } from "@/lib/sales";
import type { Translator } from "@/lib/i18n/translate";

// A product pin's published sales figures, newest first, each with the page it
// was read from (PinSales, 0267).
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
  return (
    <section
      className={`grid gap-2 text-sm ${className}`}
      aria-label={t("pin.sales.heading")}
    >
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
        {t("pin.sales.heading")}
      </h2>
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id} className="surface rounded-lg px-3 py-2">
            <span className="block text-lg font-semibold text-ink">
              {formatSalesValue(row, t.locale)}
            </span>
            <span className="block text-muted">
              {row.metric === "units"
                ? t("pin.sales.units")
                : t("pin.sales.revenue")}
              {row.scope ? ` · ${row.scope}` : ""}
              {row.period
                ? ` · ${row.period}`
                : row.asOf
                  ? ` · ${date(row.asOf)}`
                  : ""}
            </span>
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-xs text-muted underline underline-offset-2 hover:text-ink"
            >
              {t("pin.sales.source")}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
