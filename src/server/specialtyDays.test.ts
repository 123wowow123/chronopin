import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/lib/i18n/config';
import traditions from './data/specialtyTraditions.json';
import labels from './data/specialtyTraditions.labels.json';
import { specialtyDaysOn } from './specialtyDays';

describe('specialty day customs', () => {
  it("shows a day with customs first, with them in the page's language", () => {
    const [first] = specialtyDaysOn('10-12', 'en');
    expect(first).toMatchObject({ name: "National Farmer's Day" });
    expect(first.traditions?.map((t) => t.name)).toEqual(['Harvest meals', 'Farm visits', 'Thanking local farmers']);
    expect(specialtyDaysOn('10-12', 'fr')[0].traditions?.[0].label).not.toBe('Harvest meals');
  });

  it('translates every custom into every other language', () => {
    const others = LOCALES.filter((l) => l !== 'en');
    for (const name of new Set(Object.values(traditions).flat())) {
      for (const l of others) expect((labels as Record<string, Record<string, string>>)[name]?.[l], `${name} (${l})`).toBeTruthy();
    }
  });
});
