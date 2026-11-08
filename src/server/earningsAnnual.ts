import data from '@/server/data/earningsAnnual.json';
import type { AnnualEntry } from '@/lib/earningsTrends';

// Annual revenue and earnings for companies Nasdaq cannot chart, built by
// scripts/earnings/wikidataAnnual.mjs (or added by hand with a report url).
const entries = data as unknown as Record<string, AnnualEntry>;

export const annualFor = (company: string | null | undefined): AnnualEntry | null => (company ? (entries[company] ?? null) : null);
