'use client';

import { Icon } from '@/components/ui/Icon';
import { PillTip } from '@/components/ui/PillTip';
import { useT } from '@/lib/client/i18n';
import { impactBand, type ImpactBand } from '@/lib/marketImpact';

const BAND_CLASS: Record<ImpactBand, string> = {
  high: 'bg-danger/15 text-danger-soft ring-danger/40',
  medium: 'bg-amber-500/15 text-warning-soft ring-amber-500/30',
  low: 'bg-tint/5 text-muted ring-tint/10',
};

// A chart-line icon on a pin whose information can move markets, with the
// score and the reason in a tooltip. Nothing under 3/10 (impactBand).
export function MarketImpactBadge({ weight, reason, assets }: { weight?: number | null; reason?: string | null; assets?: string | null }) {
  const t = useT();
  const band = impactBand(weight);
  if (!band || weight == null) return null;
  const label = t('marketImpact.label', { weight });
  const tip = (
    <>
      <span className="font-semibold text-ink">{label}</span>
      <span>{t(`marketImpact.${band}` as 'marketImpact.high')}</span>
      {reason ? <span>{reason}</span> : null}
      {assets ? <span className="text-subtle">{t('marketImpact.assets', { assets })}</span> : null}
    </>
  );
  return (
    <PillTip tip={tip}>
      {(describedBy) => (
        <span
          tabIndex={0}
          role="img"
          aria-label={label}
          aria-describedby={describedBy}
          className={`pill-compact inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ring-1 ring-inset ${BAND_CLASS[band]}`}
        >
          <Icon name="trending-up" className="size-3" />
          {weight}
        </span>
      )}
    </PillTip>
  );
}
