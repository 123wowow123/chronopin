// Chronopin's own call on a market-predicted pin (PinForecast, 0272).
export type PinForecastEvidence = { pinId: number; note: string; title?: string | null };

export type PinForecastJson = {
  outcome: string;
  probability: number | null;
  marketProbability: number | null;
  reasoning: string;
  evidence: PinForecastEvidence[];
  checkedAt?: string;
};

export const FORECAST_LIMITS = { outcome: 200, reasoning: 1200, note: 200, evidence: 6 } as const;

const pct = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('probabilities must be 0-100');
  return Math.round(n);
};

// Validates a request body; throws a readable message the API turns into a 400.
export function parseForecast(body: Record<string, unknown>): Omit<PinForecastJson, 'checkedAt'> {
  const outcome = typeof body.outcome === 'string' ? body.outcome.trim() : '';
  const reasoning = typeof body.reasoning === 'string' ? body.reasoning.trim() : '';
  if (!outcome || outcome.length > FORECAST_LIMITS.outcome) throw new Error(`outcome is required (at most ${FORECAST_LIMITS.outcome} characters)`);
  if (!reasoning || reasoning.length > FORECAST_LIMITS.reasoning) throw new Error(`reasoning is required (at most ${FORECAST_LIMITS.reasoning} characters)`);
  const raw = body.evidence == null ? [] : body.evidence;
  if (!Array.isArray(raw) || raw.length > FORECAST_LIMITS.evidence) throw new Error(`evidence is a list of at most ${FORECAST_LIMITS.evidence} pins`);
  const evidence = raw.map((e) => {
    const item = e as Record<string, unknown>;
    const pinId = Number(item?.pinId);
    const note = typeof item?.note === 'string' ? item.note.trim() : '';
    if (!Number.isInteger(pinId) || pinId < 1 || !note || note.length > FORECAST_LIMITS.note) throw new Error(`each evidence item needs a pinId and a note of at most ${FORECAST_LIMITS.note} characters`);
    return { pinId, note };
  });
  return { outcome, reasoning, probability: pct(body.probability), marketProbability: pct(body.marketProbability), evidence };
}
