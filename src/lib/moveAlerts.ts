// Premium price and odds alerts (MoveAlert, 0236): the shapes shared by the
// server timer, the API and the pages, and the one rule for "moved enough".

export type MoveKind = 'market' | 'stock';

// Markets move in percentage points of chance; stocks in percent of price.
export type MoveUnit = 'points' | 'percent';
export const unitOf = (kind: MoveKind): MoveUnit => (kind === 'market' ? 'points' : 'percent');

export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 100;
export const DEFAULT_THRESHOLD: Record<MoveKind, number> = { market: 5, stock: 5 };
export const THRESHOLD_CHOICES: Record<MoveKind, number[]> = { market: [2, 5, 10, 20], stock: [2, 5, 10, 20] };
export const MAX_MOVE_ALERTS = 50;

// What a move is measured from: an outcome label -> points for a market,
// { price } for a stock.
export type MoveBaseline = Record<string, number>;
export const STOCK_BASELINE_KEY = 'price';

// What a 'move' notification carries.
export type MoveInfo = { kind: MoveKind; label: string; outcome: string | null; from: number; to: number; unit: MoveUnit };

export type MoveAlertRow = {
  id: number;
  kind: MoveKind;
  subject: string;
  label: string;
  pinId: number | null;
  pinTitle: string | null;
  threshold: number;
};

// How far a value has moved from its baseline, in the alert's unit (signed).
export function moveSize(kind: MoveKind, from: number, to: number): number {
  if (kind === 'market') return to - from;
  return from > 0 ? ((to - from) / from) * 100 : 0;
}

// The outcome (or the price) that moved furthest past the threshold, or null
// when nothing moved more than it. Outcomes with no baseline yet are not
// compared: they are measured from the next read.
export function biggestMove(kind: MoveKind, threshold: number, baseline: MoveBaseline, current: MoveBaseline): { key: string; from: number; to: number } | null {
  let best: { key: string; from: number; to: number; size: number } | null = null;
  for (const [key, to] of Object.entries(current)) {
    const from = baseline[key];
    if (from == null || !Number.isFinite(from) || !Number.isFinite(to)) continue;
    const size = Math.abs(moveSize(kind, from, to));
    if (size > threshold && (!best || size > best.size)) best = { key, from, to, size };
  }
  return best ? { key: best.key, from: best.from, to: best.to } : null;
}

// A value as a notification says it: "42%" for a chance, "$123.45" for a price.
export const formatMove = (kind: MoveKind, n: number) => (kind === 'stock' ? `$${n.toFixed(2)}` : `${Math.round(n)}%`);

// The line a move reads as: the outcome inside its market, or the stock.
export const moveSubject = (m: Pick<MoveInfo, 'label' | 'outcome'>) => (m.outcome ? `${m.outcome} · ${m.label}` : m.label);
