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

// A running total ("Life to date", "Shipped to date"), not one period's figure.
export const isCumulative = (period: string | null) =>
  /(?:life|shipped) to date/i.test(period ?? "");

export type SalesSegment = {
  year: number;
  value: number;
  // Set when no figure marks the end of the years from `year` to `toYear`, so
  // the value is their combined total and each year's share is unknown.
  toYear?: number;
  unknown?: boolean;
};

const yearOf = (iso: string | null) => (iso ? Number(iso.slice(0, 4)) : null);

// Splits a life-to-date row into what was added in each calendar year, from
// the other life-to-date rows of the same group dated at a year-end (December).
// A year with no year-end figure is not split: it joins the years up to the
// next known year-end as one unknown segment. Rows that are not cumulative,
// or have no date, stay one segment in their own year (or null when undated).
export function yearSegments(
  row: PinSalesJson,
  group: PinSalesJson[],
): SalesSegment[] | null {
  const endYear = yearOf(row.asOf);
  if (endYear === null || !isCumulative(row.period))
    return endYear === null ? null : [{ year: endYear, value: row.value }];
  const cumulative = group
    .filter((r) => r.asOf && isCumulative(r.period))
    .sort((a, b) => (a.asOf as string).localeCompare(b.asOf as string));
  const firstYear = yearOf(cumulative[0]?.asOf ?? null) ?? endYear;
  const segments: SalesSegment[] = [];
  let previous = 0;
  let start = firstYear;
  for (let year = firstYear; year <= endYear; year++) {
    let boundary: number | null = null;
    if (year === endYear) boundary = row.value;
    else
      for (const r of cumulative)
        if (
          (r.asOf as string) >= `${year}-12-01` &&
          (r.asOf as string) <= `${year}-12-31`
        )
          boundary = r.value;
    if (boundary === null) continue;
    const delta = Math.max(0, boundary - previous);
    if (delta > 0)
      segments.push(
        start < year
          ? { year: start, toYear: year, value: delta, unknown: true }
          : { year, value: delta },
      );
    previous = Math.max(previous, boundary);
    start = year + 1;
  }
  return segments.length ? segments : [{ year: endYear, value: row.value }];
}

// One cool colour per year (no warm hues), readable on the light and dark
// surfaces; neighbours differ enough in hue and lightness to tell apart.
// A span whose years cannot be told apart: neutral grey, no hue.
export const SALES_UNKNOWN_COLOR = "#9aa3b0";

export const SALES_YEAR_COLORS = [
  "#3374d0", // blue
  "#2a9d8f", // teal
  "#6f5fd6", // indigo
  "#1fa2c4", // cyan
  "#3f9d5b", // green
  "#64748b", // slate
];
