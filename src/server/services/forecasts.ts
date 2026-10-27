// Data for the /forecasts landing page: every industry forecast panel
// (IndustryForecast, 0216), grouped by industry on the page.

import { cacheLife, cacheTag } from 'next/cache';
import { allForecasts } from '../model/industryForecast';
import type { IndustryForecastJson } from '@/lib/industryForecast';
import { TAGS } from './cache';

export async function forecastPanels(): Promise<IndustryForecastJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.industryForecasts, TAGS.sitemap);
  return allForecasts();
}
