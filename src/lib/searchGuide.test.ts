import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { SEARCH_GUIDE, SEARCH_GUIDE_RULES } from './searchGuide';

describe('search guide examples', () => {
  const free = new Set(['iphone', 'company:Apple iphone']);
  const examples = [...SEARCH_GUIDE.flatMap((g) => g.entries.flatMap((e) => e.examples)), ...SEARCH_GUIDE_RULES.flatMap((r) => r.examples)];

  it.each(examples)('%s is read as search terms', (q) => {
    const query = parseSearchQuery(q);
    if (!free.has(q)) expect(query.text).toBe('');
  });
});
