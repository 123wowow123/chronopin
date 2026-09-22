// A pin's public data series: the shape the API answers with, and the small
// amount of arithmetic the chart needs. The numbers are never stored - they
// come from the publisher on view (src/server/eiaSeries.ts) - so everything
// here is about reading them, not keeping them.

export type SeriesPoint = { day: string; value: number };

export type PinSeriesData = {
  source: string;
  seriesId: string;
  label: string | null;
  units: string | null;
  sourceUrl: string;
  releaseDate: string | null;
  nextReleaseDate: string | null;
  latest: SeriesPoint | null;
  // The week the pin's own event falls in, when it is inside the window.
  marked: string | null;
  markedValue: number | null;
  points: SeriesPoint[];
};

export async function loadPinSeries(pinId: number): Promise<PinSeriesData[] | null> {
  try {
    const response = await fetch(`/api/pins/${pinId}/series`);
    if (response.status !== 200) return null;
    return (await response.json()) as PinSeriesData[];
  } catch {
    return null;
  }
}

// The plotted window with its bounds. The band is padded by a twentieth so a
// flat stretch does not sit on the axis and a peak is not clipped by the frame.
export function seriesExtent(points: SeriesPoint[]): { points: SeriesPoint[]; min: number; max: number } {
  if (!points.length) return { points, min: 0, max: 1 };
  let low = Infinity;
  let high = -Infinity;
  for (const p of points) {
    if (p.value < low) low = p.value;
    if (p.value > high) high = p.value;
  }
  const pad = (high - low) / 20 || Math.abs(high) / 20 || 1;
  return { points, min: low - pad, max: high + pad };
}

// How to say a published unit in a heading. EIA reports the SPR in thousand
// barrels, which reads as nine figures on a chart nobody needs to that
// precision; a million barrels is the unit the reporting uses. An unrecognised
// unit is left alone rather than guessed at.
// Longest match first: "thousand barrels per day" must not be read as
// "thousand barrels".
const UNITS: { match: RegExp; divide: number; label: string }[] = [
  { match: /thousand barrels per day/i, divide: 1000, label: 'million bbl/d' },
  { match: /million barrels per day/i, divide: 1, label: 'million bbl/d' },
  { match: /thousand barrels/i, divide: 1000, label: 'million bbl' },
  { match: /million barrels/i, divide: 1, label: 'million bbl' },
];

export function sizeOf(units: string): { divide: number; label: string } | null {
  const hit = UNITS.find((u) => u.match.test(units));
  return hit ? { divide: hit.divide, label: hit.label } : null;
}
