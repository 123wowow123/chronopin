'use client';

import { useT } from '@/lib/client/i18n';
import { pinDelay } from '@/lib/delay';
import { formatDayKey } from '@/lib/format';
import type { PinJson } from '@/lib/types';

// How far the pin's start has slipped from the day first promised, as a badge
// beside the date confidence: "5 YEARS LATE", or "~2 YEARS LATE" when the new
// date is the extractor's estimate rather than the source's. The reasoning
// fills in its title; the pin page also shows it with DelayReasoning.

const isEstimate = (reasoning?: string) => /^\s*estimated\b/i.test(reasoning || '');

export function DelayBadge({ pin }: { pin: Pick<PinJson, 'originalStartDate' | 'utcStartDateTime' | 'delayReasoning'> }) {
  const t = useT();
  const delay = pinDelay(pin, t.locale);
  if (!delay) {
    return null;
  }
  const estimate = isEstimate(pin.delayReasoning);
  const from = formatDayKey(delay.from, t.locale);
  return (
    <span
      className="rounded-full bg-red-500/15 px-2 py-px text-[10px] font-semibold tracking-wider text-danger-soft uppercase tabular-nums not-italic ring-1 ring-red-500/30 ring-inset"
      title={t(estimate ? 'delay.titleEstimated' : 'delay.title', { span: delay.label, date: from }) + (pin.delayReasoning ? ` — ${pin.delayReasoning}` : '')}
    >
      {estimate ? '~' : ''}
      {t('delay.badge', { span: delay.label })}
    </span>
  );
}

// The delay's reasoning on a line of its own, for the pin page.
export function DelayReasoning({ pin }: { pin: Pick<PinJson, 'originalStartDate' | 'utcStartDateTime' | 'delayReasoning'> }) {
  const t = useT();
  const delay = pinDelay(pin, t.locale);
  if (!delay) {
    return null;
  }
  return (
    <span className="basis-full text-xs leading-relaxed text-subtle italic">
      {t('delay.reasoning', { span: delay.label, date: formatDayKey(delay.from, t.locale) })}
      {pin.delayReasoning ? ` ${pin.delayReasoning}` : ''}
    </span>
  );
}
