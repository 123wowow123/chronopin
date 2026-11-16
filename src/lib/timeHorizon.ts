// METR's task-completion time horizons against release date, the third chart on
// an AI model pin's side panel: the length of software task (in human minutes)
// a model completes 50% or 80% of the time. Like the ECI chart the numbers are
// never stored; src/server/timeHorizon.ts reads METR's public YAML on view and
// this file is the shape the API answers with.

export type HorizonValue = {
  // Human task duration in minutes.
  minutes: number;
  low: number | null;
  high: number | null;
};

export type HorizonPoint = {
  key: string;
  name: string;
  // Release date, YYYY-MM-DD.
  date: string;
  p50: HorizonValue | null;
  p80: HorizonValue | null;
  // The pin that announced this model, when the site has one.
  pinId?: number;
  href?: string;
};

export type HorizonChartData = {
  points: HorizonPoint[];
  // The key of the pin's own model.
  pinned: string;
};

// Bump with any change to what the route sends (the response is cached for an hour).
export const HORIZON_CHART_VERSION = 1;

export async function loadHorizonChart(pinId: number): Promise<HorizonChartData | null> {
  try {
    const response = await fetch(`/api/pins/${pinId}/time-horizon?v=${HORIZON_CHART_VERSION}`);
    if (response.status !== 200) return null;
    return (await response.json()) as HorizonChartData;
  } catch {
    return null;
  }
}

// "45 sec", "6.5 min", "1.2 hr".
export function formatHorizon(minutes: number): string {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  if (minutes < 10) return `${Math.round(minutes * 10) / 10} min`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)} hr`;
}
