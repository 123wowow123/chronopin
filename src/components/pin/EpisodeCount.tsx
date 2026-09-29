'use client';

import { useT } from '@/lib/client/i18n';
import type { EpisodeStatus, PinJson } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';

// How many episodes a series, anime or other episodic work has, as a pill:
// "24 episodes" for a finished run, "1,122 episodes so far" while it is still
// going out, "12 episodes planned" for a run announced but not yet done
// (scripts/db/schema/0047_pin_episodes.sql). Nothing renders for a film or a
// pin whose count no source gave.

type EpisodePin = Pick<PinJson, 'episodeCount' | 'episodeStatus'>;

// A count with no status reads as the plain, finished one, as the column does.
const MESSAGES: Record<EpisodeStatus, { label: 'episodes.complete' | 'episodes.ongoing' | 'episodes.planned'; title: 'episodes.titleComplete' | 'episodes.titleOngoing' | 'episodes.titlePlanned' }> = {
  complete: { label: 'episodes.complete', title: 'episodes.titleComplete' },
  ongoing: { label: 'episodes.ongoing', title: 'episodes.titleOngoing' },
  planned: { label: 'episodes.planned', title: 'episodes.titlePlanned' },
};

function words(pin: EpisodePin) {
  const count = Number(pin.episodeCount);
  if (!Number.isFinite(count) || count < 1) {
    return undefined;
  }
  return { count, ...MESSAGES[pin.episodeStatus ?? 'complete'] };
}

// The three looks: the page's own pill, a card's bare run of text, and the
// chip a thread row sets beside the rating chip, sized to match it.
export function EpisodeCount({ pin, compact = false, chip = false, className = '' }: { pin: EpisodePin; compact?: boolean; chip?: boolean; className?: string }) {
  const t = useT();
  const said = words(pin);
  if (!said) {
    return null;
  }
  const label = t(said.label, { count: said.count });
  const title = t(said.title);
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium text-muted tabular-nums ${className}`} title={title}>
        <Icon name="play" className="size-3 text-subtle" />
        {label}
      </span>
    );
  }
  if (chip) {
    return (
      <span className={`surface inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-ink tabular-nums ${className}`} title={title}>
        <Icon name="play" className="size-3 text-subtle" />
        {label}
      </span>
    );
  }
  return (
    <span className={`surface inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${className}`} title={title}>
      <Icon name="play" className="size-3.5 text-subtle" />
      <span className="font-semibold text-ink tabular-nums">{label}</span>
    </span>
  );
}
