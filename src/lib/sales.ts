// A product pin's published sales figures (PinSales, 0267).

export const SALES_METRICS = ["units", "revenue"] as const;
export type SalesMetric = (typeof SALES_METRICS)[number];

export type PinSalesJson = {
  id: number;
  metric: SalesMetric;
  value: number;
  currency: string | null;
  asOf: string | null;
  period: string | null;
  scope: string | null;
  sourceUrl: string;
  quote: string | null;
};

// "9.57 million", "$1.2 billion": the figure as a person would say it.
export function formatSalesValue(
  row: Pick<PinSalesJson, "metric" | "value" | "currency">,
  locale: string,
): string {
  const options: Intl.NumberFormatOptions = {
    notation: "compact",
    maximumFractionDigits: 2,
  };
  if (row.metric === "revenue" && row.currency)
    return new Intl.NumberFormat(locale, {
      ...options,
      style: "currency",
      currency: row.currency,
    }).format(row.value);
  return new Intl.NumberFormat(locale, options).format(row.value);
}
