// Which pins are too thin for search engines to index. AdSense turned the
// site down as "low value content" (Oct 2026), and Google's thin-content
// policy counts every indexed page: a pin page with a two-line summary or one
// lone source drags down the rest. Such a pin keeps its page, says
// "noindex, follow" and stays out of the sitemap while the admin setting is on
// (/admin/search). The SQL twin of this rule is THIN_PIN_SQL in
// src/server/model/searchIssues.ts; keep the two in step.
import { plainText } from './format';
import type { PinJson } from './types';

// The fewest characters of summary text (description and long-form summary,
// tags stripped) a pin needs. On prod the median is ~1,700 and the bottom
// tenth ~840.
export const THIN_TEXT_CHARS = 600;
// The fewest cited pages (its source plus its references) a pin needs.
export const MIN_SOURCES = 2;

export type ThinReason = 'shortText' | 'oneSource';

export const THIN_REASON_LABELS: Record<ThinReason, string> = {
  shortText: 'Short text',
  oneSource: 'One source',
};

// The pin's summary text length, as a reader sees it.
export function pinTextLength(pin: Pick<PinJson, 'description' | 'longFormSummary'>): number {
  return plainText(pin.description).length + plainText(pin.longFormSummary).length;
}

// Its cited pages: the source, and each reference that is not the source again
// (as pinEvidence lists them).
export function pinSourceCount(pin: Pick<PinJson, 'sourceUrl' | 'references'>): number {
  const source = pin.sourceUrl?.trim();
  const others = (pin.references || []).filter((r) => r.url !== source).length;
  return (source ? 1 : 0) + others;
}

// Why a pin is thin; empty when it is not. Judge the English pin: a Chinese
// or Japanese translation says as much in far fewer characters.
export function thinReasons(pin: Pick<PinJson, 'description' | 'longFormSummary' | 'sourceUrl' | 'references'>): ThinReason[] {
  const reasons: ThinReason[] = [];
  if (pinTextLength(pin) < THIN_TEXT_CHARS) reasons.push('shortText');
  if (pinSourceCount(pin) < MIN_SOURCES) reasons.push('oneSource');
  return reasons;
}

// The admin setting: whether thin pins ask search engines not to index them.
// On by default.
export type HideThinPinsSetting = { enabled: boolean };

export const DEFAULT_HIDE_THIN_PINS: HideThinPinsSetting = { enabled: true };

export function parseHideThinPins(value: unknown): { setting: HideThinPinsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
