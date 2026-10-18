import { describe, expect, it } from 'vitest';
import { draftAsReferences, referencesToAdd } from './duplicateDraft';
import { EMPTY_FORM, type PinFormValues } from './pinForm';

const draft: PinFormValues = {
  ...EMPTY_FORM,
  sourceUrl: ' https://news.example.com/launch ',
  title: 'Rocket launch',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  dateConfidence: 'scheduled',
  dateConfidenceReasoning: 'The agency lists it as scheduled.',
  references: [
    { id: 9, url: 'https://agency.example.gov/launch', title: 'Agency', confidence: '85', publishedDate: '2026-09-01', startDate: '', endDate: '', reasoning: '', utcCreatedDateTime: '2026-09-02T00:00:00Z' },
    { url: '', title: '', confidence: '', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
  ],
};

describe('draftAsReferences', () => {
  it('makes the source link a reference rated like a source, then the draft references', () => {
    expect(draftAsReferences(draft)).toEqual([
      {
        url: 'https://news.example.com/launch',
        title: 'Rocket launch',
        confidence: 75,
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        reasoning: 'The agency lists it as scheduled.',
      },
      { url: 'https://agency.example.gov/launch', title: 'Agency', confidence: 85, publishedDate: '2026-09-01', startDate: undefined, endDate: undefined, reasoning: undefined },
    ]);
  });

  it('rates an unrated source as unknown and drops a one-day end', () => {
    const [source] = draftAsReferences({ ...draft, dateConfidence: '', endDate: '2026-10-01', references: [] });
    expect(source).toMatchObject({ confidence: 25, startDate: '2026-10-01', endDate: undefined });
  });

  it('has nothing without a link', () => {
    expect(draftAsReferences({ ...draft, sourceUrl: 'not a link', references: [] })).toEqual([]);
  });
});

describe('referencesToAdd', () => {
  const pin = { sourceUrl: 'https://www.example.com/event/', references: [{ url: 'http://other.example.com/a#top' }] };

  it('skips the pin source, its references and repeats however they are written', () => {
    const fresh = referencesToAdd(pin, [
      { url: 'https://example.com/event' },
      { url: 'https://other.example.com/a' },
      { url: 'https://new.example.com/b' },
      { url: 'https://www.new.example.com/b/' },
      { url: 'not a link' },
    ]);
    expect(fresh).toEqual([{ url: 'https://new.example.com/b' }]);
  });
});
