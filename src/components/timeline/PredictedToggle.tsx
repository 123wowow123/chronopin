'use client';

import { SwitchMark } from '@/components/nav/NavMenu';
import { useT } from '@/lib/client/i18n';

export function PredictedToggle({
  enabled,
  onChange,
  className = '',
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      className={`relative flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm max-lg:py-3 in-[[data-drawer-controls]]:pe-0 in-[[data-drawer-controls]]:ps-2 ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        aria-label={t('controls.predicted')}
        className="absolute inset-0 scale-100 rounded-[inherit] before:absolute before:inset-x-1.5 before:inset-y-1 before:rounded-lg before:transition-colors hover:before:bg-tint/[0.04] active:before:bg-tint/[0.08]"
      />
      <span className="pointer-events-none relative font-semibold text-ink">{t('controls.predicted')}</span>
      <span className="pointer-events-none relative flex shrink-0 items-center">
        <SwitchMark on={enabled} size="sm" />
      </span>
    </div>
  );
}

