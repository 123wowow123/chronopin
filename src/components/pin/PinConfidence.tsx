import { type Evidence, HALF_LIFE_DAYS, pinConfidence } from '@/lib/referenceConfidence';

export function confidenceClass(confidence: number | undefined) {
  if (confidence == null) return 'bg-white/5 text-muted ring-white/10';
  if (confidence >= 75) return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
  if (confidence >= 50) return 'bg-sky-500/15 text-sky-300 ring-sky-500/30';
  if (confidence >= 25) return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
  return 'bg-red-500/15 text-red-300 ring-red-500/30';
}

// The pin's overall confidence from its source and references, as a badge.
export function PinConfidence({ evidence }: { evidence: Evidence[] }) {
  const confidence = pinConfidence(evidence);
  if (confidence === undefined) {
    return null;
  }
  const count = evidence.filter((e) => e.confidence != null).length;
  return (
    <span
      className={`rounded-full px-2 py-px text-[10px] font-semibold tracking-wider tabular-nums not-italic ring-1 ring-inset ${confidenceClass(confidence)}`}
      title={`Weighted average of ${count} reference${count === 1 ? '' : 's'}${evidence.some((e) => e.isSource && e.confidence != null) ? ', the source included' : ''}; a reference counts half as much for every ${HALF_LIFE_DAYS} days older than the newest`}
    >
      {confidence}% CONFIDENCE
    </span>
  );
}
