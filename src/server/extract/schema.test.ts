import { describe, expect, it } from 'vitest';
import { emptyAsNull, SCHEMA } from './index';

// The API's structured output refuses a schema with more than 16 fields that
// can be null ("too many parameters with union types"), and a refused schema
// fails every extraction - the scrape then quietly hands the work to a session.
describe('extraction schema', () => {
  it('stays within the structured-output limit on nullable fields', () => {
    const unions = Object.values(SCHEMA.properties).filter((p) => Array.isArray((p as { type?: unknown }).type) || 'anyOf' in (p as object));
    expect(unions.length).toBeLessThanOrEqual(16);
  });

  it('reads an empty answer for the plain-string fields as none', () => {
    const fields = emptyAsNull({ workTitle: '', amazonUrl: ' ', originalStartDate: '2027-12-31', title: '' });
    expect(fields).toEqual({ workTitle: null, amazonUrl: null, originalStartDate: '2027-12-31', title: '' });
  });
});
