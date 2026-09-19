import { pinDelay } from '@/lib/delay';
import { formatDayKey } from '@/lib/format';
import type { PinJson } from '@/lib/types';

// How far the pin's start has slipped from the day first promised, as a badge
// beside the date confidence: "5 YEARS LATE", or "~2 YEARS LATE" when the new
// date is the extractor's estimate rather than the source's. The reasoning
// fills in its title; the pin page also shows it with DelayReasoning.

const isEstimate = (reasoning?: string) => /^\s*estimated\b/i.test(reasoning || '');

export function DelayBadge({ pin }: { pin: Pick<PinJson, 'originalStartDate' | 'utcStartDateTime' | 'delayReasoning'> }) {
  const delay = pinDelay(pin);
  if (!delay) {
    return null;
  }
  const estimate = isEstimate(pin.delayReasoning);
  return (
    <span
      className="rounded-full bg-red-500/15 px-2 py-px text-[10px] font-semibold tracking-wider text-danger-soft uppercase tabular-nums not-italic ring-1 ring-red-500/30 ring-inset"
      title={`${estimate ? 'An estimated' : 'A'} ${delay.label} delay: first promised for ${formatDayKey(delay.from)}${pin.delayReasoning ? ` — ${pin.delayReasoning}` : ''}`}
    >
      {estimate ? '~' : ''}
      {delay.label} late
    </span>
  );
}

// The delay's reasoning on a line of its own, for the pin page.
export function DelayReasoning({ pin }: { pin: Pick<PinJson, 'originalStartDate' | 'utcStartDateTime' | 'delayReasoning'> }) {
  const delay = pinDelay(pin);
  if (!delay) {
    return null;
  }
  return (
    <span className="basis-full text-xs leading-relaxed text-subtle italic">
      First promised for {formatDayKey(delay.from)}; now {delay.label} later.{pin.delayReasoning ? ` ${pin.delayReasoning}` : ''}
    </span>
  );
}
