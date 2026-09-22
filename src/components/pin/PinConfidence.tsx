'use client';

import { useT } from '@/lib/client/i18n';
import type { MessageKey, Translator } from '@/lib/i18n/translate';
import { type ConfidenceBand, confidenceBand, confidenceBandRange, type Evidence, HALF_LIFE_DAYS, pinConfidence } from '@/lib/referenceConfidence';
import { RefineLink } from './RefineLink';

export function confidenceClass(confidence: number | undefined) {
  if (confidence == null) return 'bg-tint/5 text-muted ring-tint/10';
  if (confidence >= 75) return 'bg-emerald-500/15 text-success-soft ring-emerald-500/30';
  if (confidence >= 50) return 'bg-sky-500/15 text-info-soft ring-sky-500/30';
  if (confidence >= 25) return 'bg-amber-500/15 text-warning-soft ring-amber-500/30';
  return 'bg-red-500/15 text-danger-soft ring-red-500/30';
}

const BAND_TITLE: Record<ConfidenceBand, MessageKey> = {
  low: 'confidence.showBand.low',
  medium: 'confidence.showBand.medium',
  high: 'confidence.showBand.high',
};

// What clicking a score searches for: the pins scored in the same band
// (confidence:low), and the line of the badge's title that says so.
export function bandTitle(band: ConfidenceBand, t: Translator) {
  const { from, to } = confidenceBandRange(band);
  return t(BAND_TITLE[band], { from, to });
}

// A score as a badge that searches for the pins scored like it. The band is
// read off the score shown, so the amber and the red badge both search for
// confidence:low - what the pin page flags as low confidence.
export function ConfidenceBadge({ confidence, className, title, children }: { confidence: number | undefined; className: string; title: string; children: React.ReactNode }) {
  const t = useT();
  const band = confidenceBand(confidence);
  const pill = `rounded-full px-2 py-px text-[10px] font-semibold tracking-wider tabular-nums ring-1 ring-inset ${className}`;
  if (!band) {
    return <span className={pill} title={title}>{children}</span>;
  }
  return (
    <RefineLink
      field="confidence"
      value={band}
      // The badges sit in a tight row of pills, so the tap target grows past
      // the pill rather than the pill growing (DateConfidence does the same).
      className={`relative ${pill} after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline hover:ring-current`}
      title={`${title}\n${bandTitle(band, t)}`}
    >
      {children}
    </RefineLink>
  );
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
    <ConfidenceBadge
      confidence={confidence}
      className={`not-italic ${confidenceClass(confidence)}`}
      title={t(evidence.some((e) => e.isSource && e.confidence != null) ? 'confidence.titleWithSource' : 'confidence.title', { count, days: HALF_LIFE_DAYS })}
    >
      {t('confidence.badge', { percent: confidence })}
    </ConfidenceBadge>
  );
}
