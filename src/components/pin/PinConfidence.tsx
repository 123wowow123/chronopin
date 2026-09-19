'use client';

import { useT } from '@/lib/client/i18n';
import { type Evidence, HALF_LIFE_DAYS, pinConfidence } from '@/lib/referenceConfidence';

export function confidenceClass(confidence: number | undefined) {
  if (confidence == null) return 'bg-tint/5 text-muted ring-tint/10';
  if (confidence >= 75) return 'bg-emerald-500/15 text-success-soft ring-emerald-500/30';
  if (confidence >= 50) return 'bg-sky-500/15 text-info-soft ring-sky-500/30';
  if (confidence >= 25) return 'bg-amber-500/15 text-warning-soft ring-amber-500/30';
  return 'bg-red-500/15 text-danger-soft ring-red-500/30';
}

// The pin's overall confidence from its source and references, as a badge.
export function PinConfidence({ evidence }: { evidence: Evidence[] }) {
  const t = useT();
  const confidence = pinConfidence(evidence);
  if (confidence === undefined) {
    return null;
  }
  const count = evidence.filter((e) => e.confidence != null).length;
  return (
    <span
      className={`rounded-full px-2 py-px text-[10px] font-semibold tracking-wider tabular-nums not-italic ring-1 ring-inset ${confidenceClass(confidence)}`}
      title={t(evidence.some((e) => e.isSource && e.confidence != null) ? 'confidence.titleWithSource' : 'confidence.title', { count, days: HALF_LIFE_DAYS })}
    >
      {t('confidence.badge', { percent: confidence })}
    </span>
  );
}
