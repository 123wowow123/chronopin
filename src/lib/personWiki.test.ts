import { describe, expect, it } from 'vitest';
import { lintBundle } from './okfLint';
import { bioguideUrl, citedUrls, compile, hostOf, personWikiBundle, personWikiPage, urlIdentity } from './personWiki';
import type { PersonProfile } from './people';

const base: PersonProfile = {
  id: 7, name: 'Susan Collins', slug: 'susan-collins', role: 'senator', office: 'United States Senator from Maine', jurisdiction: 'Maine', party: 'Republican', photoUrl: null,
  leftOfficeDate: null, politics: 'Moderate Republican', politicsSourceUrl: 'https://example.com/politics', inOfficeSince: '1997-01-03', birthDate: '1952-12-07', deathDate: null,
  religion: 'Catholic', religionSourceUrl: 'https://www.wikidata.org/wiki/Q22252', weightKg: null, weightAsOf: null, weightSourceUrl: null,
  health: null, healthAsOf: null, healthSourceUrl: null, description: null, photoCredit: null, wikiUrl: 'https://en.wikipedia.org/wiki/Susan_Collins', websiteUrl: null,
  bioguideId: 'C001035',
  mattersCheckedDate: null,
  matters: [],
  phases: [],
  educationLevel: null,
  educationNote: null,
  educationSourceUrl: null,
  earnings: [
    { year: 2025, kind: 'salary', label: 'Senate salary', amount: 174_000, amountLow: null, amountHigh: null, currency: 'USD', sourceUrl: 'https://example.com/pay', note: null },
    { year: 2024, kind: 'salary', label: 'Senate salary', amount: 174_000, amountLow: null, amountHigh: null, currency: 'USD', sourceUrl: 'https://example.com/pay/', note: null },
  ],
  contributions: [
    { kind: 'law', title: 'Kay Hagan Tick Reauthorization Act', summary: 'Reauthorizes tick-borne disease work.', role: 'sponsor', date: '2026-09-30', reference: 'Pub. L. 119-118', importance: 3, sourceUrl: 'https://www.congress.gov/bill/119th-congress/senate-bill/2398' },
  ],
  properties: [],
  trips: [],
};

describe('urlIdentity', () => {
  it('reads two spellings of one link as the same', () => {
    expect(urlIdentity('https://www.Example.com/pay/#top')).toBe(urlIdentity('https://example.com/pay'));
    expect(urlIdentity('https://example.com/a?x=1')).not.toBe(urlIdentity('https://example.com/a'));
    expect(hostOf('https://www.opm.gov/x')).toBe('opm.gov');
  });
});

describe('citedUrls', () => {
  it('lists who they are first, then each fact in page order, once', () => {
    expect(citedUrls(base)).toEqual([
      'https://bioguide.congress.gov/search/bio/C001035',
      'https://en.wikipedia.org/wiki/Susan_Collins',
      'https://example.com/politics',
      'https://www.wikidata.org/wiki/Q22252',
      'https://example.com/pay',
      'https://www.congress.gov/bill/119th-congress/senate-bill/2398',
    ]);
  });

  it('leaves out a link that is not https', () => {
    expect(citedUrls({ ...base, politicsSourceUrl: 'http://example.com/p' })).not.toContain('http://example.com/p');
    expect(bioguideUrl('nope')).toBeNull();
  });
});

describe('compile', () => {
  it('numbers the references and points every cited URL at its number', () => {
    const c = compile(base, new Map([[urlIdentity('https://example.com/pay'), { title: 'Pay tables', recorded: '2026-10-10' }]]), new Date('2026-10-10T12:00:00Z'));
    expect(c.references.map((r) => r.ref)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(c.refs['https://example.com/pay']).toBe(5);
    // The same link spelled with a trailing slash is the same reference.
    expect(c.refs['https://example.com/pay/']).toBe(5);
    expect(c.basics).toEqual([1, 2]);
    expect(c.references[4]).toMatchObject({ title: 'Pay tables', recorded: '2026-10-10', host: 'example.com' });
  });
});

describe('personWikiPage', () => {
  const compiled = compile(base, new Map(), new Date('2026-10-10T12:00:00Z'));
  const page = personWikiPage(compiled);

  it('is an OKF Person concept citing each statement to a listed source', () => {
    expect(page).toContain('type: Person');
    expect(page).toContain('- Religion: Catholic[^s4]');
    expect(page).toContain('Born: 1952-12-07[^s1][^s2]');
    expect(page).toContain('[^s5]: example.com. https://example.com/pay');
    expect(page).toContain('generated: { by: chronopin-person-wiki/1, at: 2026-10-10T12:00:00Z }');
  });

  it('is one concept of a bundle that passes the OKF lint', () => {
    const files = personWikiBundle([{ slug: 'susan-collins', name: 'Susan Collins', role: 'senator', page, builtAt: '2026-10-10T12:00:00Z' }]);
    expect([...files.keys()].sort()).toEqual(['index.md', 'log.md', 'people/index.md', 'people/susan-collins.md']);
    expect(lintBundle(files)).toEqual([]);
  });
});
