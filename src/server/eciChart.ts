// The data behind the ECI chart on AI model pins: Epoch AI's public, keyless
// eci_scores.csv, read on view with an hour's cache and never stored (the
// PinSeries rule, ../lib/series). The pin's model is found by its title, the
// longest model name that appears in it as a run of whole words.

import { markFrontierByDate, matchModel, parseEciScores } from './eciParse';
import type { EciChartData, EciPoint } from '@/lib/eciChart';
import { pinPath } from '@/lib/seo';
import { modelRelease } from '@/lib/modelSeries';
import { pinFor, wordsOf, type ModelPinIndex } from './modelChart';
import log from './util/log';

const CSV_URL = 'https://epoch.ai/data/eci_scores.csv';
const TIMEOUT_MS = 20000;
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com) eci chart fetch';

let cache: { expires: number; promise: Promise<EciPoint[] | null> } | null = null;

export function cachedEciScores(): Promise<EciPoint[] | null> {
  if (cache && cache.expires > Date.now()) return cache.promise;
  const entry = {
    expires: Date.now() + TTL_MS,
    promise: fetch(CSV_URL, { headers: { 'User-Agent': UA, Accept: 'text/csv' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Epoch ${response.status}`);
        return markFrontierByDate(parseEciScores(await response.text()));
      })
      .catch((err) => {
        entry.expires = Date.now() + ERROR_TTL_MS;
        log.error('eciChart', (err as Error)?.message);
        return null;
      }),
  };
  cache = entry;
  return entry.promise;
}

// null when the pin names no scored model.
// Same-thread flag as the cost/quality chart: a dot is red when its own pin is
// on the same model line as the pin being read.
export function buildEciChart(points: EciPoint[], title: string, pins: ModelPinIndex = [], currentPinId?: number): EciChartData | null {
  const own = matchModel(points, title);
  if (!own) return null;
  const line = modelRelease(title)?.line;
  const keys = points.map((p) => wordsOf(p.key));
  const flagged = points.map((p) => {
    const pin = p.key !== own.key ? pinFor(pins, p.key, keys) : undefined;
    const thread = line != null && (p.key === own.key || (pin != null && modelRelease(pin.title)?.line === line));
    if (p.key === own.key) return { ...p, thread, pinId: currentPinId };
    return pin ? { ...p, thread, pinId: pin.id, href: pinPath(pin) } : { ...p, thread };
  });
  return { points: flagged, pinned: own.key };
}
