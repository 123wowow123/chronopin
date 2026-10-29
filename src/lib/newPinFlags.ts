// What a freshly created pin still lacks to be search-ready: the thin floor
// (searchQuality.ts) and, for a pin that is a product, a restaurant, a hotel
// or an AI model, the rubric whose independent reviews feed its Review markup
// (seo.ts entityJsonLd). A flag is advice for the run's report, not a refusal.
import { isRestaurantPin } from './restaurantTimeline';
import { THIN_REASON_LABELS, thinReasons } from './searchQuality';
import type { PinJson } from './types';

// Categories whose pins are things to taste, drive, fly, run or stay in.
const RUBRIC_CATEGORIES: Record<string, string> = {
  Food: 'taste or dining rubric',
  Automotive: 'car performance rubric',
  Aerospace: 'aircraft performance rubric',
  AI: 'model performance rubric',
  Travel: 'hotel rubric',
};

export function newPinFlags(pin: Pick<PinJson, 'description' | 'longFormSummary' | 'sourceUrl' | 'references' | 'categories' | 'tags'>): string[] {
  const flags = thinReasons(pin).map((reason) => `thin: ${THIN_REASON_LABELS[reason]}`);
  const rubric = isRestaurantPin(pin) ? 'dining rubric' : (pin.categories ?? []).map((c) => RUBRIC_CATEGORIES[c]).find(Boolean);
  if (rubric) {
    flags.push(`check for a ${rubric} with 3 verified independent reviews, if this pin is a product, restaurant, hotel or model (no review markup without it)`);
  }
  if (pin.tags?.some((tag) => tag.name === 'AI Models')) {
    flags.push('complete model enrichment in this run: six-axis rubric, sourced spec graphs/tables and relevant credited official media; save_model_tables accepts charts; record specific unavailable evidence rather than inventing figures');
  }
  return flags;
}
