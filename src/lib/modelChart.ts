// Cost against quality for AI models, the chart on an AI model pin's side
// panel: LMArena's text Elo on the y axis, the price of a million tokens on a
// log x axis, one dot per model, the pin's own model drawn large. The numbers
// are never stored - both sources are read on view (src/server/modelChart.ts)
// - so this file is only the shape the API answers with and the arithmetic
// the chart needs, the same split as ./series.
//
// "Price" is the blended price of a million tokens at five input tokens to
// one output token, the ratio the public cost/Elo charts use:
// (5 * input + output) / 6, in dollars per million.

export type ModelPoint = {
  // The key the arena name and the router's slug were joined on
  // ("claude opus 4.6"); stable across both sources.
  key: string;
  // The arena's own name for the model, what a reader will recognise.
  name: string;
  organization: string | null;
  elo: number;
  // Dollars per million tokens at 5:1 input:output.
  price: number;
  // The year the model was released (the router's listing date).
  year: number;
  // On the Pareto frontier of its year: nothing cheaper that scores as high.
  frontier?: boolean;
  // The pin that announced this model, when the site has one: its path, and
  // the id so the chart can tell it is the pin being read.
  pinId?: number;
  href?: string;
};

export type ModelChartData = {
  // Every model with both a score and a price, newest year first in `years`.
  points: ModelPoint[];
  years: number[];
  // The key of the pin's own model, when it is among the points.
  pinned: string | null;
  // The year the pin's model belongs to, so the chart opens on it.
  pinnedYear: number | null;
  // When the arena published the scores this reads (YYYY-MM-DD).
  publishedOn: string | null;
};

export async function loadModelChart(pinId: number): Promise<ModelChartData | null> {
  try {
    const response = await fetch(`/api/pins/${pinId}/model-chart`);
    if (response.status !== 200) return null;
    return (await response.json()) as ModelChartData;
  } catch {
    return null;
  }
}

// $/M tokens at the 5:1 input:output ratio, from per-token prices.
export function blendedPrice(promptPerToken: number, completionPerToken: number): number {
  return ((5 * promptPerToken + completionPerToken) / 6) * 1_000_000;
}

// Effort and mode suffixes the arena appends to one model's name; the router
// lists the model once, so they are not part of its identity.
const SUFFIX = /(?:[- ](?:xhigh|high|medium|low|minimal|max|thinking|reasoning|non-thinking|no-thinking|adaptive|preview|\d+k))+$/;
const PAREN = /\s*\([^)]*\)\s*/g;
const DATE_STAMP = /[- ](?:20\d{2}-?\d{2}-?\d{2}|\d{4}|\d{6,8})$/;
const ROUTER_VARIANT = /:(?:free|batch|extended|thinking|nitro|floor|exacto)$/;

// "claude-opus-4-6-high" and "anthropic/claude-opus-4.6" are one model:
// lower case, no provider prefix, no effort or preview suffix, no date stamp, every
// separator a space, and the minor-version hyphen a dot.
export function modelKey(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(ROUTER_VARIANT, '');
  if (s.includes('/')) s = s.slice(s.lastIndexOf('/') + 1);
  s = s.replace(PAREN, ' ').trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(SUFFIX, '').replace(DATE_STAMP, '');
    if (s === before) break;
  }
  // 4-6 -> 4.6, only between single digits so "gpt-4-1106" style stamps stay out.
  s = s.replace(/(\d)-(\d)(?!\d)/g, '$1.$2');
  s = s.replace(/[-_\s]+/g, ' ').trim();
  // Names a title spaces out ("o 3", "v 3.1") are the arena's "o3" and "v3.1".
  return s.replace(/\b([ov]) (\d)/g, '$1$2');
}

// The frontier of a set of points: walking from the cheapest, a point is on it
// when it beats every cheaper (or equally priced) point's score.
export function markFrontier(points: ModelPoint[]): ModelPoint[] {
  const sorted = [...points].sort((a, b) => a.price - b.price || b.elo - a.elo);
  let best = -Infinity;
  const on = new Set<string>();
  for (const p of sorted) {
    if (p.elo > best) {
      best = p.elo;
      on.add(p.key);
    }
  }
  return points.map((p) => ({ ...p, frontier: on.has(p.key) }));
}

// "$0.40" / "$12" / "$0.05": a price a reader can compare at a glance.
export function showPrice(value: number): string {
  if (value >= 10) return `$${Math.round(value)}`;
  if (value >= 1) return `$${value.toFixed(2).replace(/\.?0+$/, '')}`;
  return `$${value.toFixed(2)}`;
}
