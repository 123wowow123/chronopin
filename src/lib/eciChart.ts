// Epoch AI's Capabilities Index (ECI) against release date, the second chart on
// an AI model pin's side panel: one dot per model, the pin's own model drawn
// large with its confidence interval. Like the cost/quality chart the scores are
// never stored; src/server/eciChart.ts reads Epoch's public CSV on view and this
// file is the shape the API answers with.

export type EciPoint = {
  key: string;
  name: string;
  organization: string | null;
  eci: number;
  low: number | null;
  high: number | null;
  // Release date, YYYY-MM-DD.
  date: string;
  // Open weights (Epoch's accessibility group), drawn hollow.
  open: boolean;
  // A new best ECI when it was released: nothing earlier scored as high.
  frontier: boolean;
  // In the same thread (model line) as the pin being read: drawn red.
  thread?: boolean;
  // The pin that announced this model, when the site has one.
  pinId?: number;
  href?: string;
};

export type EciChartData = {
  points: EciPoint[];
  // The key of the pin's own model.
  pinned: string;
  // Set client-side by a windowed chart: the best score before its first date.
  baseline?: number;
};

// Bump with any change to what the route sends (the response is cached for an hour).
export const ECI_CHART_VERSION = 3;

export async function loadEciChart(pinId: number): Promise<EciChartData | null> {
  try {
    const response = await fetch(`/api/pins/${pinId}/eci-chart?v=${ECI_CHART_VERSION}`);
    if (response.status !== 200) return null;
    return (await response.json()) as EciChartData;
  } catch {
    return null;
  }
}
