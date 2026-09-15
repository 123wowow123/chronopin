import { TIMELINE_MIN_CONFIDENCE } from './referenceConfidence';

// Whether the home timeline hides low-confidence pins, and below what score.
// An admin setting; TIMELINE_MIN_CONFIDENCE is only the default.
export type TimelineConfidenceSetting = { enabled: boolean; threshold: number };

export const DEFAULT_TIMELINE_CONFIDENCE: TimelineConfidenceSetting = { enabled: true, threshold: TIMELINE_MIN_CONFIDENCE };

// The score a pin needs to show, or null when nothing is hidden.
export function minConfidence(setting: TimelineConfidenceSetting): number | null {
  return setting.enabled ? setting.threshold : null;
}

// A stored or submitted value as a setting, or the problem with it.
export function parseTimelineConfidence(value: unknown): { setting: TimelineConfidenceSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled, threshold }' };
  }
  const { enabled, threshold } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    return { problem: 'threshold must be a whole number from 0 to 100' };
  }
  return { setting: { enabled, threshold } };
}
